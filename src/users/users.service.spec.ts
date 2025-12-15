import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { User } from '../../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from './users.service';

describe('The UsersService', () => {
  let usersService: UsersService;
  let findUniqueMock: jest.Mock;

  beforeEach(async () => {
    findUniqueMock = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: findUniqueMock,
            },
          },
        },
      ],
    }).compile();

    usersService = await module.get(UsersService);
  });

  describe('when the getByEmail function is called', () => {
    describe('and the findUnique method returns the user', () => {
      let user: User & { articles: unknown[] };

      beforeEach(() => {
        user = {
          id: 1,
          email: 'john@smith.com',
          name: 'John',
          password: 'strongPassword123',
          addressId: null,
          phoneNumber: null,
          articles: [],
        };
        findUniqueMock.mockResolvedValue(user);
      });

      it('should return the user', async () => {
        const result = await usersService.getByEmail(user.email);
        expect(result).toBe(user);
      });
    });

    describe('and the findUnique method does not return the user', () => {
      beforeEach(() => {
        findUniqueMock.mockResolvedValue(undefined);
      });

      it('should throw the NotFoundException', async () => {
        return expect(async () => {
          await usersService.getByEmail('missing@user.com');
        }).rejects.toThrow(NotFoundException);
      });
    });
  });
});


