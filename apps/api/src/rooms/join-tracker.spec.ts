import { joinTracker } from './join-tracker.js';

describe('joinTracker', () => {
  it('combines the user and the room', () => {
    expect(
      joinTracker({ user: { id: 'user-1' }, params: { id: 'room-1' } }),
    ).toBe('user-1:room-1');
  });

  it('gives a different key for a different room', () => {
    const user = { id: 'user-1' };
    expect(joinTracker({ user, params: { id: 'room-1' } })).not.toBe(
      joinTracker({ user, params: { id: 'room-2' } }),
    );
  });

  it('falls back to the IP, so users never share one key', () => {
    expect(
      joinTracker({ user: null, ip: '203.0.113.9', params: { id: 'room-1' } }),
    ).toBe('203.0.113.9:room-1');
  });
});
