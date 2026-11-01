import { Test } from '@nestjs/testing';
import { RoomsRepository, type Room } from './rooms.repository.js';
import { RoomsService } from './rooms.service.js';

describe('RoomsService', () => {
  const repository = {
    createWithOwner: vi.fn(),
    findAllForViewer: vi.fn(),
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

      await service.create('cuser1', { name: 'general', description: 'Say hi' });

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
});
