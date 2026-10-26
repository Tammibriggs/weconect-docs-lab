import { normalizePosts } from './post'

const post = (id, createdAt) => ({ _id: id, createdAt, likes: [] })

describe('normalizePosts', () => {
  it('sorts newest first, whatever order the API used', () => {
    const response = { data: [post('a', '2026-10-24T10:00:00Z'), post('b', '2026-10-25T08:00:00Z'), post('c', '2026-10-24T12:00:00Z')] }
    expect(normalizePosts(response).map((p) => p._id)).toEqual(['b', 'c', 'a'])
  })

  it('drops repeats, such as your own posts when you follow yourself', () => {
    const response = { data: [post('a', '2026-10-24T10:00:00Z'), post('a', '2026-10-24T10:00:00Z')] }
    expect(normalizePosts(response)).toHaveLength(1)
  })

  it('handles a missing list', () => {
    expect(normalizePosts(undefined)).toEqual([])
    expect(normalizePosts({ data: null })).toEqual([])
  })
})
