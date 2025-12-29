import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User, UserProfile, UserStatus } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { PasswordService } from './password.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '../../entities/wallet-transaction.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private walletService: WalletService,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });

    if (user && user.passwordHash) {
      const isValidPassword = await this.passwordService.verify(password, user.passwordHash);
      if (isValidPassword) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Ensure USDT wallet exists for the user (backwards compatibility)
    try {
      await this.walletService.getWalletByCurrency(user.id, 'USDT');
    } catch (error) {
      await this.walletService.createWallet(user.id, 'USDT', '10000').catch(() => { });
    }

    // Store refresh token session
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: await this.passwordService.hash(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    await this.sessionRepository.save(session);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async register(createUserDto: any) {
    const hashedPassword = await this.passwordService.hash(createUserDto.password);

    const user = this.userRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      passwordHash: hashedPassword,
      status: UserStatus.ACTIVE, // Set as active immediately
      emailVerified: true, // Auto-verify for simulation
    });

    const savedUser = await this.userRepository.save(user);

    // Initial funding: Create USDT wallet with 10,000 USDT
    await this.walletService.createWallet(savedUser.id, 'USDT', '10000').catch(err => {
      console.error('Failed to create initial USDT wallet during registration', err);
    });

    // Create user profile
    const profile = this.userProfileRepository.create({
      userId: savedUser.id,
      fullName: createUserDto.fullName,
      country: createUserDto.country,
    });
    await this.userProfileRepository.save(profile);

    return this.login(savedUser);
  }

  async logout(refreshToken: string) {
    const tokenHash = await this.passwordService.hash(refreshToken);
    await this.sessionRepository.delete({ refreshTokenHash: tokenHash });
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.login(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}