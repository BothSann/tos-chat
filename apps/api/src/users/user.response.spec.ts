import { UserResponse } from './user.response.js';

describe('UserResponse.from', () => {
  it('maps the Better Auth user to the public UserView fields', () => {
    expect(
      UserResponse.from({
        id: 'cuser1',
        name: 'The Octocat',
        image: 'https://avatars.githubusercontent.com/u/583231',
      }),
    ).toEqual({
      id: 'cuser1',
      displayName: 'The Octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
    });
  });

  it('drops every other field of the session user', () => {
    const sessionUser = {
      id: 'cuser1',
      name: 'The Octocat',
      image: null,
      email: 'octocat@users.example',
      emailVerified: true,
      createdAt: new Date(),
    };

    expect(Object.keys(UserResponse.from(sessionUser))).toEqual([
      'id',
      'displayName',
      'avatarUrl',
    ]);
  });

  it('answers null when the user has no avatar', () => {
    expect(UserResponse.from({ id: 'cuser1', name: 'Ann' }).avatarUrl).toBe(
      null,
    );
  });
});
