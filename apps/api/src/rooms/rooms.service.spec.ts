import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RoomsRepository, type Room } from './rooms.repository.js';
import { RoomsService } from './rooms.service.js';

describe('RoomsService', () => {
  const repository = {
    createWithOwner: vi.fn(),
    findAllForViewer: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  let service: RoomsService;

  const general: Room = {
    id: 'croom1',
    name: 'general',
    description: null,
    ownerId: 'cuser1',
    createdAt: new Date('2026-10-31T09:00:00.000Z'),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: RoomsRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(RoomsService);
  });

  describe('create', () => {
    it('makes the caller the owner and returns the room as a member', async () => {
      repository.createWithOwner.mockResolvedValue(general);

      const room = await service.create('cuser1', { name: 'general' });

      expect(repository.createWithOwner).toHaveBeenCalledWith({
        name: 'general',
        description: null,
        ownerId: 'cuser1',
      });
      expect(room).toEqual({ ...general, isMember: true });
    });

    it('passes the description through when there is one', async () => {
      repository.createWithOwner.mockResolvedValue({
        ...general,
        description: 'Say hi',
      });

      await service.create('cuser1', {
        name: 'general',
        description: 'Say hi',
      });

      expect(repository.createWithOwner).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Say hi' }),
      );
    });

    it('lets a repository error (such as a taken name) reach the filter', async () => {
      const taken = new Error('unique violation');
      repository.createWithOwner.mockRejectedValue(taken);

      await expect(service.create('cuser1', { name: 'general' })).rejects.toBe(
        taken,
      );
    });
  });

  describe('list', () => {
    it('returns the rooms the repository found for that viewer', async () => {
      const rooms = [{ ...general, isMember: false }];
      repository.findAllForViewer.mockResolvedValue(rooms);

      await expect(service.list('cuser2')).resolves.toBe(rooms);
      expect(repository.findAllForViewer).toHaveBeenCalledWith('cuser2');
    });
  });

  describe('update', () => {
    it('lets the owner change the room and returns it as a member', async () => {
      const renamed = { ...general, name: 'random', description: null };
      repository.findById.mockResolvedValue(general);
      repository.update.mockResolvedValue(renamed);

      const room = await service.update('cuser1', 'croom1', {
        name: 'random',
        description: null,
      });

      expect(repository.update).toHaveBeenCalledWith('croom1', {
        name: 'random',
        description: null,
      });
      expect(room).toEqual({ ...renamed, isMember: true });
    });

    it('passes missing fields on as undefined, so they stay unchanged', async () => {
      repository.findById.mockResolvedValue(general);
      repository.update.mockResolvedValue(general);

      await service.update('cuser1', 'croom1', {});

      expect(repository.update).toHaveBeenCalledWith('croom1', {
        name: undefined,
        description: undefined,
      });
    });

    it('throws 404 when the room does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('cuser1', 'cmissing', { name: 'random' }),
      ).rejects.toThrow(new NotFoundException('Room not found'));
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws 403 when the caller is not the owner', async () => {
      repository.findById.mockResolvedValue(general);

      await expect(
        service.update('cuser2', 'croom1', { name: 'random' }),
      ).rejects.toThrow(
        new ForbiddenException('Only the room owner can do this'),
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the owner delete the room', async () => {
      repository.findById.mockResolvedValue(general);

      await service.remove('cuser1', 'croom1');

      expect(repository.delete).toHaveBeenCalledWith('croom1');
    });

    it('throws 404 when the room does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('cuser1', 'cmissing')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('throws 403 when the caller is not the owner', async () => {
      repository.findById.mockResolvedValue(general);

      await expect(service.remove('cuser2', 'croom1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
