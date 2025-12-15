import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { User } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthenticationService } from './authentication.service';
import { WrongCredentialsException } from './wrong-credentials.exception';
import { SignUpDto } from './dto/sign-up.dto';
import { LogInDto } from './dto/log-in.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('The AuthenticationService', () => {
  let authenticationService: AuthenticationService;

  let usersServiceCreateMock: jest.Mock;
  let usersServiceGetByEmailMock: jest.Mock;
  let jwtSignMock: jest.Mock;
  let configGetMock: jest.Mock;

  beforeEach(async () => {
    usersServiceCreateMock = jest.fn();
    usersServiceGetByEmailMock = jest.fn();
    jwtSignMock = jest.fn();
    configGetMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: {
            create: usersServiceCreateMock,
            getByEmail: usersServiceGetByEmailMock,
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jwtSignMock,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
      ],
    }).compile();

    authenticationService = await module.get(AuthenticationService);
  });

  describe('when the signUp function is called', () => {
    let signUpDto: SignUpDto;

    beforeEach(() => {
      signUpDto = {
        email: 'john@smith.com',
        name: 'John',
        password: 'strongPassword123',
        phoneNumber: null,
      };
    });

    describe('and the password is hashed successfully', () => {
      beforeEach(() => {
        (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
        usersServiceCreateMock.mockResolvedValue({
          id: 1,
          email: signUpDto.email,
          name: signUpDto.name,
          password: 'hashedPassword',
          phoneNumber: null,
        } satisfies User);
      });

      it('should call UsersService.create with the hashed password and return created user', async () => {
        const result = await authenticationService.signUp(signUpDto);

        expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);
        expect(usersServiceCreateMock).toHaveBeenCalledWith({
          name: signUpDto.name,
          email: signUpDto.email,
          phoneNumber: signUpDto.phoneNumber,
          password: 'hashedPassword',
        });
        expect(result).toEqual({
          id: 1,
          email: signUpDto.email,
          name: signUpDto.name,
          password: 'hashedPassword',
          phoneNumber: null,
        });
      });
    });
  });

  describe('when the getAuthenticatedUser function is called', () => {
    let logInDto: LogInDto;
    let user: User;

    beforeEach(() => {
      logInDto = {
        email: 'john@smith.com',
        password: 'strongPassword123',
      };
      user = {
        id: 1,
        email: logInDto.email,
        name: 'John',
        password: 'hashedPassword',
        phoneNumber: null,
      };
    });

    describe('and the credentials are valid', () => {
      beforeEach(() => {
        usersServiceGetByEmailMock.mockResolvedValue(user);
        (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
      });

      it('should return the user', async () => {
        const result = await authenticationService.getAuthenticatedUser(logInDto);
        expect(result).toBe(user);
      });
    });

    describe('and the user cannot be found', () => {
      beforeEach(() => {
        usersServiceGetByEmailMock.mockRejectedValue(new NotFoundException());
      });

      it('should throw the WrongCredentialsException', async () => {
        return expect(async () => {
          await authenticationService.getAuthenticatedUser(logInDto);
        }).rejects.toThrow(WrongCredentialsException);
      });
    });

    describe('and the password is not matching', () => {
      beforeEach(() => {
        usersServiceGetByEmailMock.mockResolvedValue(user);
        (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);
      });

      it('should throw the WrongCredentialsException', async () => {
        return expect(async () => {
          await authenticationService.getAuthenticatedUser(logInDto);
        }).rejects.toThrow(WrongCredentialsException);
      });
    });
  });

  describe('when the getCookieWithJwtToken function is called', () => {
    describe('and jwtService & configService return expected values', () => {
      beforeEach(() => {
        jwtSignMock.mockReturnValue('signed.jwt.token');
        configGetMock.mockReturnValue('3600');
      });

      it('should return a predictable cookie string', () => {
        const result = authenticationService.getCookieWithJwtToken(123);

        expect(jwtSignMock).toHaveBeenCalledWith({ userId: 123 });
        expect(configGetMock).toHaveBeenCalledWith('JWT_EXPIRATION_TIME');
        expect(result).toBe(
          'Authentication=signed.jwt.token; HttpOnly; Path=/; Max-Age=3600',
        );
      });
    });
  });

  describe('when the getCookieForLogOut function is called', () => {
    it('should return the log out cookie string', () => {
      const result = authenticationService.getCookieForLogOut();
      expect(result).toBe('Authentication=; HttpOnly; Path=/; Max-Age=0');
    });
  });
});


