import { ExecutionContext, INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../database/prisma.service';
import { ProfileImagesController } from './profile-images.controller';
import { ProfileImagesService } from './profile-images.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { Prisma } from '../../generated/prisma';
import { PrismaError } from '../database/prisma-error.enum';

describe('The ProfileImagesController', () => {
  let app: INestApplication;

  let profileImageCreateMock: jest.Mock;
  let profileImageFindUniqueMock: jest.Mock;
  let profileImageUpdateMock: jest.Mock;
  let profileImageDeleteMock: jest.Mock;

  const createKnownRequestError = (code: string) => {
    return new Prisma.PrismaClientKnownRequestError('Known Prisma error', {
      code,
      clientVersion: 'test',
    } as any);
  };

  beforeEach(async () => {
    profileImageCreateMock = jest.fn();
    profileImageFindUniqueMock = jest.fn();
    profileImageUpdateMock = jest.fn();
    profileImageDeleteMock = jest.fn();

    const module = await Test.createTestingModule({
      providers: [
        ProfileImagesService,
        {
          provide: PrismaService,
          useValue: {
            profileImage: {
              create: profileImageCreateMock,
              findUnique: profileImageFindUniqueMock,
              update: profileImageUpdateMock,
              delete: profileImageDeleteMock,
            },
          },
        },
      ],
      controllers: [ProfileImagesController],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({
        ...mockJwtAuthenticationGuard,
        canActivate: (context: ExecutionContext) =>
          mockJwtAuthenticationGuard.canActivate(context),
      })
      .compile();

    app = await createTestApp(module);
  });

  describe('when the POST /profile-images endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            ProfileImagesService,
            {
              provide: PrismaService,
              useValue: {
                profileImage: {
                  create: profileImageCreateMock,
                  findUnique: profileImageFindUniqueMock,
                  update: profileImageUpdateMock,
                  delete: profileImageDeleteMock,
                },
              },
            },
          ],
          controllers: [ProfileImagesController],
        })
          .overrideGuard(JwtAuthenticationGuard)
          .useValue({
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer())
          .post('/profile-images')
          .send({ url: 'https://example.com/avatar.png' })
          .expect(401);
      });
    });

    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/profile-images')
          .send({ url: 'not-a-url' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        profileImageCreateMock.mockResolvedValue({
          id: 1,
          userId: 1,
          url: 'https://example.com/avatar.png',
        });
      });

      it('should respond with the created profile image', () => {
        return request(app.getHttpServer())
          .post('/profile-images')
          .send({ url: 'https://example.com/avatar.png' })
          .expect(201)
          .expect({
            id: 1,
            userId: 1,
            url: 'https://example.com/avatar.png',
          });
      });
    });
  });

  describe('when the PATCH /profile-images endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            ProfileImagesService,
            {
              provide: PrismaService,
              useValue: {
                profileImage: {
                  create: profileImageCreateMock,
                  findUnique: profileImageFindUniqueMock,
                  update: profileImageUpdateMock,
                  delete: profileImageDeleteMock,
                },
              },
            },
          ],
          controllers: [ProfileImagesController],
        })
          .overrideGuard(JwtAuthenticationGuard)
          .useValue({
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer())
          .patch('/profile-images')
          .send({ url: 'https://example.com/new-avatar.png' })
          .expect(401);
      });
    });

    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/profile-images')
          .send({ url: 'not-a-url' })
          .expect(400);
      });
    });

    describe('and the profile image does not exist', () => {
      beforeEach(() => {
        profileImageUpdateMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer())
          .patch('/profile-images')
          .send({ url: 'https://example.com/new-avatar.png' })
          .expect(404);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        profileImageUpdateMock.mockResolvedValue({
          id: 1,
          userId: 1,
          url: 'https://example.com/new-avatar.png',
        });
      });

      it('should respond with the updated profile image', () => {
        return request(app.getHttpServer())
          .patch('/profile-images')
          .send({ url: 'https://example.com/new-avatar.png' })
          .expect(200)
          .expect({
            id: 1,
            userId: 1,
            url: 'https://example.com/new-avatar.png',
          });
      });
    });
  });

  describe('when the GET /profile-images/user/:userId endpoint is called', () => {
    describe('and the profile image exists', () => {
      beforeEach(() => {
        profileImageFindUniqueMock.mockResolvedValue({
          id: 2,
          userId: 2,
          url: 'https://example.com/u2.png',
        });
      });

      it('should respond with the profile image', () => {
        return request(app.getHttpServer())
          .get('/profile-images/user/2')
          .expect(200)
          .expect({
            id: 2,
            userId: 2,
            url: 'https://example.com/u2.png',
          });
      });
    });

    describe('and the profile image does not exist', () => {
      beforeEach(() => {
        profileImageFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).get('/profile-images/user/999').expect(404);
      });
    });

    describe('and :userId is not a number', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .get('/profile-images/user/not-a-number')
          .expect(400);
      });
    });
  });

  describe('when the GET /profile-images/my-profile-image endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            ProfileImagesService,
            {
              provide: PrismaService,
              useValue: {
                profileImage: {
                  create: profileImageCreateMock,
                  findUnique: profileImageFindUniqueMock,
                  update: profileImageUpdateMock,
                  delete: profileImageDeleteMock,
                },
              },
            },
          ],
          controllers: [ProfileImagesController],
        })
          .overrideGuard(JwtAuthenticationGuard)
          .useValue({
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer())
          .get('/profile-images/my-profile-image')
          .expect(401);
      });
    });

    describe('and the profile image exists', () => {
      beforeEach(() => {
        profileImageFindUniqueMock.mockResolvedValue({
          id: 1,
          userId: 1,
          url: 'https://example.com/avatar.png',
        });
      });

      it('should respond with the profile image', () => {
        return request(app.getHttpServer())
          .get('/profile-images/my-profile-image')
          .expect(200)
          .expect({
            id: 1,
            userId: 1,
            url: 'https://example.com/avatar.png',
          });
      });
    });

    describe('and the profile image does not exist', () => {
      beforeEach(() => {
        profileImageFindUniqueMock.mockResolvedValue(undefined);
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer())
          .get('/profile-images/my-profile-image')
          .expect(404);
      });
    });
  });

  describe('when the DELETE /profile-images endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          providers: [
            ProfileImagesService,
            {
              provide: PrismaService,
              useValue: {
                profileImage: {
                  create: profileImageCreateMock,
                  findUnique: profileImageFindUniqueMock,
                  update: profileImageUpdateMock,
                  delete: profileImageDeleteMock,
                },
              },
            },
          ],
          controllers: [ProfileImagesController],
        })
          .overrideGuard(JwtAuthenticationGuard)
          .useValue({
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer()).delete('/profile-images').expect(401);
      });
    });

    describe('and the profile image exists', () => {
      beforeEach(() => {
        profileImageDeleteMock.mockResolvedValue({
          id: 1,
          userId: 1,
          url: 'https://example.com/avatar.png',
        });
      });

      it('should respond with the deleted profile image', () => {
        return request(app.getHttpServer()).delete('/profile-images').expect(200).expect({
          id: 1,
          userId: 1,
          url: 'https://example.com/avatar.png',
        });
      });
    });

    describe('and the profile image does not exist', () => {
      beforeEach(() => {
        profileImageDeleteMock.mockRejectedValue(
          createKnownRequestError(PrismaError.RecordDoesNotExist),
        );
      });

      it('should respond with 404', () => {
        return request(app.getHttpServer()).delete('/profile-images').expect(404);
      });
    });
  });
});


