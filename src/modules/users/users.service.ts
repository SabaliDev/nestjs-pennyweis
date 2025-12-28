import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserProfile } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
  ) {}

  async findAll() {
    return this.userRepository.find({
      relations: ['profile'],
      select: ['id', 'email', 'username', 'status', 'emailVerified', 'kycStatus', 'createdAt'],
    });
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
      select: ['id', 'email', 'username', 'status', 'emailVerified', 'kycStatus', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  async findByUsername(username: string) {
    return this.userRepository.findOne({
      where: { username },
      relations: ['profile'],
      select: ['id', 'email', 'username', 'status', 'emailVerified', 'kycStatus', 'createdAt'],
    });
  }

  async updateProfile(userId: string, updateData: Partial<UserProfile>) {
    const user = await this.findOne(userId);
    
    if (!user.profile) {
      // Create profile if it doesn't exist
      const profile = this.userProfileRepository.create({
        userId,
        ...updateData,
      });
      await this.userProfileRepository.save(profile);
      return this.findOne(userId);
    } else {
      // Update existing profile
      await this.userProfileRepository.update(
        { userId },
        updateData
      );
      return this.findOne(userId);
    }
  }

  async updateLastLogin(userId: string, ipAddress?: string) {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });
  }

  async deactivateUser(userId: string) {
    const user = await this.findOne(userId);
    user.status = 'suspended' as any;
    return this.userRepository.save(user);
  }

  async activateUser(userId: string) {
    const user = await this.findOne(userId);
    user.status = 'active' as any;
    return this.userRepository.save(user);
  }

  async getUserStats(userId: string) {
    const user = await this.findOne(userId);
    
    // This would typically query related tables for stats
    return {
      userId: user.id,
      totalTrades: 0, // TODO: Get from trades table
      totalWallets: 0, // TODO: Get from wallets table
      joinedAt: user.createdAt,
      lastActive: user.lastLoginAt,
    };
  }
}