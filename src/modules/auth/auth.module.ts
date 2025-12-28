import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WalletModule } from '../wallet/wallet.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordService } from './password.service';
import { User, UserProfile } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { OAuthProvider } from '../../entities/oauth-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile, UserSession, OAuthProvider]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: `${configService.get<number>('app.jwt.accessTokenExpiryHours')}h`,
          issuer: configService.get<string>('app.jwt.issuer'),
          audience: configService.get<string>('app.jwt.audience'),
        },
      }),
      inject: [ConfigService],
    }),
    WalletModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, JwtStrategy, LocalStrategy],
  exports: [AuthService, PasswordService],
})
export class AuthModule {}