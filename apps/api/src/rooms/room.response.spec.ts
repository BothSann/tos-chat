import { RoomResponse } from './room.response.js';

describe('RoomResponse.from', () => {
  const room = {
    id: 'croom1',
    name: 'general',
    description: null,
    ownerId: 'cuser1',
    createdAt: new Date('2026-10-31T09:00:00.000Z'),
    isMember: true,
  };

  it('maps a room to the RoomView fields with an ISO createdAt', () => {
    expect(RoomResponse.from(room)).toEqual({
      id: 'croom1',
      name: 'general',
      description: null,
      ownerId: 'cuser1',
      createdAt: '2026-10-31T09:00:00.000Z',
      isMember: true,
    });
  });

  it('drops fields that are not part of RoomView', () => {
    const withSecret = { ...room, passwordHash: '$argon2id$...' };

    expect(Object.keys(RoomResponse.from(withSecret))).toEqual([
      'id',
      'name',
      'description',
      'ownerId',
      'createdAt',
      'isMember',
    ]);
  });
});
