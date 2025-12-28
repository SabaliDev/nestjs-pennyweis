import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../../entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../../entities/wallet-transaction.entity';
import Decimal from 'decimal.js-light';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private transactionRepository: Repository<WalletTransaction>,
  ) {}

  async getUserWallets(userId: string) {
    return this.walletRepository.find({
      where: { userId },
      relations: ['transactions'],
      order: { currency: 'ASC' },
    });
  }

  async getWalletByCurrency(userId: string, currency: string) {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet for ${currency} not found`);
    }

    return wallet;
  }

  async createWallet(userId: string, currency: string, initialBalance = '0') {
    const existingWallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (existingWallet) {
      throw new BadRequestException(`Wallet for ${currency} already exists`);
    }

    const wallet = this.walletRepository.create({
      userId,
      currency,
      balance: initialBalance,
      lockedBalance: '0',
      totalDeposited: initialBalance,
      totalWithdrawn: '0',
    });

    const savedWallet = await this.walletRepository.save(wallet);

    // Create initial transaction if there's an initial balance
    if (new Decimal(initialBalance).greaterThan(0)) {
      await this.createTransaction(
        userId,
        currency,
        TransactionType.INITIAL_DEPOSIT,
        initialBalance,
        '0',
        initialBalance,
        'Initial wallet creation',
      );
    }

    return savedWallet;
  }

  async updateBalance(
    userId: string,
    currency: string,
    amount: string,
    transactionType: TransactionType,
    description?: string,
    referenceId?: string,
  ) {
    const wallet = await this.getWalletByCurrency(userId, currency);
    
    const currentBalance = new Decimal(wallet.balance);
    const changeAmount = new Decimal(amount);
    const newBalance = currentBalance.plus(changeAmount);

    if (newBalance.lessThan(0)) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    wallet.balance = newBalance.toString();

    // Update totals based on transaction type
    if (changeAmount.greaterThan(0)) {
      wallet.totalDeposited = new Decimal(wallet.totalDeposited).plus(changeAmount).toString();
    } else {
      wallet.totalWithdrawn = new Decimal(wallet.totalWithdrawn).plus(changeAmount.abs()).toString();
    }

    await this.walletRepository.save(wallet);

    // Create transaction record
    await this.createTransaction(
      userId,
      currency,
      transactionType,
      amount,
      balanceBefore,
      wallet.balance,
      description,
      referenceId,
    );

    return wallet;
  }

  async lockBalance(userId: string, currency: string, amount: string) {
    const wallet = await this.getWalletByCurrency(userId, currency);
    
    const availableBalance = new Decimal(wallet.balance).minus(new Decimal(wallet.lockedBalance));
    const lockAmount = new Decimal(amount);

    if (availableBalance.lessThan(lockAmount)) {
      throw new BadRequestException('Insufficient available balance to lock');
    }

    wallet.lockedBalance = new Decimal(wallet.lockedBalance).plus(lockAmount).toString();
    
    return this.walletRepository.save(wallet);
  }

  async unlockBalance(userId: string, currency: string, amount: string) {
    const wallet = await this.getWalletByCurrency(userId, currency);
    
    const lockedBalance = new Decimal(wallet.lockedBalance);
    const unlockAmount = new Decimal(amount);

    if (lockedBalance.lessThan(unlockAmount)) {
      throw new BadRequestException('Cannot unlock more than locked balance');
    }

    wallet.lockedBalance = lockedBalance.minus(unlockAmount).toString();
    
    return this.walletRepository.save(wallet);
  }

  async getTransactionHistory(
    userId: string,
    currency?: string,
    limit = 50,
    offset = 0,
  ) {
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .orderBy('transaction.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    if (currency) {
      query.andWhere('transaction.currency = :currency', { currency });
    }

    return query.getManyAndCount();
  }

  async getAvailableBalance(userId: string, currency: string): Promise<string> {
    const wallet = await this.getWalletByCurrency(userId, currency);
    return new Decimal(wallet.balance).minus(new Decimal(wallet.lockedBalance)).toString();
  }

  private async createTransaction(
    userId: string,
    currency: string,
    transactionType: TransactionType,
    amount: string,
    balanceBefore: string,
    balanceAfter: string,
    description?: string,
    referenceId?: string,
  ) {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transaction = this.transactionRepository.create({
      userId,
      walletId: wallet.id,
      currency,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      referenceId,
    });

    return this.transactionRepository.save(transaction);
  }
}