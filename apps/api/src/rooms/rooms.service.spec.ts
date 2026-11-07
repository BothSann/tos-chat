import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash, verify } from 'argon2';
import { RoomsRepository, type Room } from './rooms.repository.js';
import { RoomsService } from './rooms.service.js';

describe('RoomsService', () => {
  const repository = {
    createWithOwner: vi.fn(),
    findAllForViewer: vi.fn(),
    findById: vi.fn(),
    findForJoin: vi.fn(),
    isMember: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  let service: RoomsService;

  const general: Room = {
    id: 'croom1',
    name: 'general',
    description: null,
    type: 'PUBLIC',
    ownerId: 'cuser1',
    createdAt: new Date('2026-10-31T09:00:00.000Z'),
  };
  const secret: Room = { ...general, id: 'croom2', type: 'PRIVATE' };

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
        type: 'PUBLIC',
        passwordHash: null,
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

  describe('private rooms', () => {
    it('stores an argon2 hash of the password, never the password', async () => {
      repository.createWithOwner.mockResolvedValue(secret);

      await service.create('cuser1', {
        name: 'general',
        type: 'PRIVATE',
        password: 'correct-horse',
      });

      const [[saved]] = repository.createWithOwner.mock.calls;
      expect(saved.type).toBe('PRIVATE');
      expect(saved.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await verify(saved.passwordHash, 'correct-horse')).toBe(true);
    });

    it('refuses a password on a new public room', async () => {
      await expect(
        service.create('cuser1', {
          name: 'general',
          password: 'correct-horse',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.createWithOwner).not.toHaveBeenCalled();
    });

    it('lets the owner change the password of a private room', async () => {
      repository.findById.mockResolvedValue(secret);
      repository.update.mockResolvedValue(secret);

      await service.update('cuser1', secret.id, { password: 'new-password' });

      const [[, changes]] = repository.update.mock.calls;
      expect(await verify(changes.passwordHash, 'new-password')).toBe(true);
    });

    it('leaves the password alone when the update has none', async () => {
      repository.findById.mockResolvedValue(secret);
      repository.update.mockResolvedValue(secret);

      await service.update('cuser1', secret.id, { name: 'renamed' });

      const [[, changes]] = repository.update.mock.calls;
      expect(changes.passwordHash).toBeUndefined();
    });

    it('never touches memberships when the password changes', async () => {
      repository.findById.mockResolvedValue(secret);
      repository.update.mockResolvedValue(secret);

      await service.update('cuser1', secret.id, { password: 'new-password' });

      expect(repository.removeMember).not.toHaveBeenCalled();
    });

    it('answers 422 with fields for a password on a public room', async () => {
      repository.findById.mockResolvedValue(general);

      const error = await service
        .update('cuser1', general.id, { password: 'new-password' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toEqual({
        message: 'Validation failed',
        fields: { password: ['password is only for private rooms'] },
      });
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('answers 403 before 422 when a non-owner sends a password', async () => {
      repository.findById.mockResolvedValue(general);

      await expect(
        service.update('cuser2', general.id, { password: 'new-password' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('join', () => {
    const asTarget = (
      room: Room,
      passwordHash: string | null,
      isMember = false,
    ) => ({
      ...room,
      passwordHash,
      isMember,
    });

    it('adds a new member to a public room without a password', async () => {
      repository.findForJoin.mockResolvedValue(asTarget(general, null));

      const room = await service.join('cuser2', general.id, {});

      expect(repository.addMember).toHaveBeenCalledWith('cuser2', general.id);
      expect(room).toEqual({ ...general, isMember: true });
    });

    it('ignores a password sent to a public room', async () => {
      repository.findForJoin.mockResolvedValue(asTarget(general, null));

      await service.join('cuser2', general.id, { password: 'anything' });

      expect(repository.addMember).toHaveBeenCalledOnce();
    });

    it('adds a member to a private room with the right password', async () => {
      const passwordHash = await hash('correct-horse');
      repository.findForJoin.mockResolvedValue(asTarget(secret, passwordHash));

      const room = await service.join('cuser2', secret.id, {
        password: 'correct-horse',
      });

      expect(repository.addMember).toHaveBeenCalledWith('cuser2', secret.id);
      expect(room).toEqual({ ...secret, isMember: true });
      expect(room).not.toHaveProperty('passwordHash');
    });

    it.each([
      ['wrong', { password: 'wrong-horse' }],
      ['missing', {}],
      ['empty', { password: '' }],
    ])('answers 403 for a %s password and adds nobody', async (_, dto) => {
      const passwordHash = await hash('correct-horse');
      repository.findForJoin.mockResolvedValue(asTarget(secret, passwordHash));

      await expect(service.join('cuser2', secret.id, dto)).rejects.toThrow(
        new ForbiddenException('Wrong room password'),
      );
      expect(repository.addMember).not.toHaveBeenCalled();
    });

    it('treats a private room with no stored hash as closed, not open', async () => {
      repository.findForJoin.mockResolvedValue(asTarget(secret, null));

      await expect(
        service.join('cuser2', secret.id, { password: 'anything' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.addMember).not.toHaveBeenCalled();
    });

    it('answers an existing member with no password check and no write', async () => {
      const passwordHash = await hash('correct-horse');
      repository.findForJoin.mockResolvedValue(
        asTarget(secret, passwordHash, true),
      );

      const room = await service.join('cuser2', secret.id, {});

      expect(repository.addMember).not.toHaveBeenCalled();
      expect(room).toEqual({ ...secret, isMember: true });
    });

    it('throws 404 when the room does not exist', async () => {
      repository.findForJoin.mockResolvedValue(null);

      await expect(service.join('cuser2', 'cmissing', {})).rejects.toThrow(
        new NotFoundException('Room not found'),
      );
    });
  });

  describe('assertMember', () => {
    it('passes for a member', async () => {
      repository.findById.mockResolvedValue(general);
      repository.isMember.mockResolvedValue(true);

      await expect(
        service.assertMember('cuser2', general.id),
      ).resolves.toBeUndefined();
      expect(repository.isMember).toHaveBeenCalledWith('cuser2', general.id);
    });

    it('throws 403 for a non-member', async () => {
      repository.findById.mockResolvedValue(general);
      repository.isMember.mockResolvedValue(false);

      await expect(service.assertMember('cuser2', general.id)).rejects.toThrow(
        new ForbiddenException('Only room members can do this'),
      );
    });

    it('throws 404 when the room does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.assertMember('cuser2', 'cmissing')).rejects.toThrow(
        new NotFoundException('Room not found'),
      );
      expect(repository.isMember).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    it('removes a member', async () => {
      repository.findById.mockResolvedValue(general);

      await service.leave('cuser2', general.id);

      expect(repository.removeMember).toHaveBeenCalledWith(
        'cuser2',
        general.id,
      );
    });

    it('refuses the owner and keeps their membership', async () => {
      repository.findById.mockResolvedValue(general);

      await expect(service.leave('cuser1', general.id)).rejects.toThrow(
        new ForbiddenException('Delete the room instead'),
      );
      expect(repository.removeMember).not.toHaveBeenCalled();
    });

    it('throws 404 when the room does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.leave('cuser2', 'cmissing')).rejects.toThrow(
        new NotFoundException('Room not found'),
      );
    });
  });
});
