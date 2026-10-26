import { relationship } from './PeopleSearch'

const me = { _id: 'me' }

describe('relationship', () => {
  it('says when you follow each other', () => {
    expect(relationship({ followers: ['me'], followings: ['me'] }, me)).toBe('You follow each other')
  })

  it('says when you follow them', () => {
    expect(relationship({ followers: ['me'], followings: [] }, me)).toBe('Following')
  })

  it('says when they follow you', () => {
    expect(relationship({ followers: [], followings: ['me'] }, me)).toBe('Follows you')
  })

  it('falls back to their bio', () => {
    expect(relationship({ followers: [], followings: [], bio: 'Hi' }, me)).toBe('Hi')
  })
})
