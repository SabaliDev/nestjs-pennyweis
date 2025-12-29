import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../entities/order.entity';
import Decimal from 'decimal.js-light';

interface CreateOrderDto {
  userId: string;
  symbol: string;
  side: any;
  orderType: any;
  quantity: string;
  price?: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) { }

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = this.orderRepository.create({
      userId: createOrderDto.userId,
      symbol: createOrderDto.symbol,
      side: createOrderDto.side,
      orderType: createOrderDto.orderType,
      quantity: createOrderDto.quantity,
      price: createOrderDto.price,
      filledQuantity: '0',
      status: OrderStatus.NEW,
    });

    return this.orderRepository.save(order);
  }

  async findOrderById(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findUserOrders(
    userId: string,
    symbol?: string,
    status?: OrderStatus,
    limit = 50,
    offset = 0,
  ) {
    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (symbol) {
      query.andWhere('order.symbol = :symbol', { symbol });
    }

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    return query.getManyAndCount();
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.findOrderById(orderId);

    // Validate status transition
    if (!this.canTransitionStatus(order.status, status)) {
      throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    }

    order.status = status;
    return this.orderRepository.save(order);
  }

  async fillOrder(orderId: string, fillQuantity: string): Promise<Order> {
    const order = await this.findOrderById(orderId);

    const currentFilled = new Decimal(order.filledQuantity);
    const fillAmount = new Decimal(fillQuantity);
    const totalQuantity = new Decimal(order.quantity);

    const newFilledQuantity = currentFilled.plus(fillAmount);

    if (newFilledQuantity.greaterThan(totalQuantity)) {
      throw new Error('Fill quantity exceeds remaining order quantity');
    }

    order.filledQuantity = newFilledQuantity.toString();

    // Update status based on fill level
    if (newFilledQuantity.equals(totalQuantity)) {
      order.status = OrderStatus.FILLED;
    } else if (newFilledQuantity.greaterThan(0)) {
      order.status = OrderStatus.PARTIALLY_FILLED;
    }

    return this.orderRepository.save(order);
  }

  async getActiveOrders(symbol?: string) {
    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.status IN (:...statuses)', {
        statuses: [OrderStatus.NEW, OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]
      })
      .orderBy('order.createdAt', 'DESC');

    if (symbol) {
      query.andWhere('order.symbol = :symbol', { symbol });
    }

    return query.getMany();
  }

  async getOrderBook(symbol: string) {
    const orders = await this.orderRepository.find({
      where: {
        symbol,
        status: OrderStatus.OPEN,
      },
      order: { price: 'ASC' },
    });

    const buyOrders = orders
      .filter(order => order.side === 'buy')
      .sort((a, b) => new Decimal(b.price || '0').minus(new Decimal(a.price || '0')).toNumber());

    const sellOrders = orders
      .filter(order => order.side === 'sell')
      .sort((a, b) => new Decimal(a.price || '0').minus(new Decimal(b.price || '0')).toNumber());

    return {
      symbol,
      bids: buyOrders.map(order => ({
        price: order.price,
        quantity: new Decimal(order.quantity).minus(new Decimal(order.filledQuantity)).toString(),
        orderId: order.id,
      })),
      asks: sellOrders.map(order => ({
        price: order.price,
        quantity: new Decimal(order.quantity).minus(new Decimal(order.filledQuantity)).toString(),
        orderId: order.id,
      })),
      timestamp: new Date(),
    };
  }

  async getOrderHistory(
    userId: string,
    symbol?: string,
    limit = 100,
    offset = 0,
  ) {
    const query = this.orderRepository.createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (symbol) {
      query.andWhere('order.symbol = :symbol', { symbol });
    }

    return query.getManyAndCount();
  }

  private canTransitionStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.OPEN, OrderStatus.CANCELLED, OrderStatus.REJECTED],
      [OrderStatus.OPEN]: [OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.REJECTED],
      [OrderStatus.PARTIALLY_FILLED]: [OrderStatus.FILLED, OrderStatus.CANCELLED],
      [OrderStatus.FILLED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }
}