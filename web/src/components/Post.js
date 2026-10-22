import { useEffect, useState } from 'react'
import '../styles/post.css'
import { formatNumber } from '../modules/formatNumber'
import { useSelector } from 'react-redux'
import { useDeletePostMutation, useGetPostQuery, useLikeNdislikePostMutation } from '../redux/services/post'
import { useGetUserByIdQuery } from '../redux/services/user'
import moment from 'moment';
import Modal from './Modal'
import { ref, deleteObject } from "firebase/storage";
import {storage} from '../firebase'

const Post = ({
  id,
  userId
}) => {

  const [likeNdislike] = useLikeNdislikePostMutation()
  const user = useSelector((state) => state.auth.user)
  const {data: post} = useGetPostQuery({postId: id})
  const {data: userData} = useGetUserByIdQuery({id: userId})
  const [deleteFunc] = useDeletePostMutation()

  const [comment, setComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [openComment] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

  const likeNDdislike = () => {
    setIsLiked(!isLiked)
    likeNdislike({userId:user._id, postId:id})
    if(isLiked) {
      setLikeCount(likeCount - 1)
    }else {
      setLikeCount(likeCount + 1)
    }
  }

  const deletePost = async () => {
    const desertRef = ref(storage, `weConect/${post.data.img.filename}`)
    await deleteFunc({postId: post.data._id})
    setDeleteModal(false)
    await deleteObject(desertRef)
  }

  useEffect(() => {
    if(post?.data) {
      setIsLiked(post?.data.likes.includes(user._id))
      setLikeCount(post?.data.likes.length)
    }
  }, [post, userData, user._id]) 

  const sendComment = () => {}
 
  return (
    <div className="post"> 
      <div className='post__head'>
        <div>
          <img src={userData?.data.profilePicture.url ? userData?.data.profilePicture.url : '/assets/noPic.webp'} alt='profile'/>
          <span>
            <span className='post__posterName'>{userData?.data.username}</span>
            <span>{moment(post?.data.createdAt).fromNow(true)}</span>
          </span>
        </div>
        {post?.data.userId === user._id &&
          <img src='/assets/trash.png' alt='trash' onClick={() => setDeleteModal(true)}/>
        }
      </div>  
      <p>{post?.data.desc}</p>
      {post?.data?.img?.url &&
        <img src={post?.data.img.url} alt="post pic" />
      }

      <div className="postReact">
        <span>
          <img
            src={isLiked? '/assets/like.png': '/assets/notlike.png'} 
            alt="" 
            onClick={likeNDdislike} 
          />
          {formatNumber(likeCount)}
        </span>
        {/* <span onClick={() => setOpenComment(!openComment)}>
          <img src='/assets/comment.png' alt="" />
          {post?.data.comments.length}
        </span> */}
      </div>

      {openComment &&
        <div>
          {/* input box for adding comment */}
          <form className='post__addComment'>
            <input 
              type='text'
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder='Add a comment...'
            />
            <button 
              type='submit' 
              disabled={!comment.trim()} 
              onClick={sendComment}
            >Post</button>
          </form>

          {/* comments */}
          {post?.data.comments.length > 0 && (
            <div className='post__comments'>
              {post.data.comments.map(comment => (
                <div key={comment.id} className='post__comment'>
                  <img 
                    src={comment.userImage} 
                    alt='commenter'/>
                    <div>
                      <span>{comment.username}</span>{' '}
                      <span>{comment.timestamp}</span><br />
                      <p>{comment.comment}</p>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
       }

       <Modal 
        open={deleteModal}
        custom_modal='post__modal'
        onClose = {() => setDeleteModal(false)}
       >
          <div className='post__deleteModal'>
            <span>Are you sure you want to delete this post</span>
            <div className='post__deleteModal__buttons'>
              <button onClick={() => setDeleteModal(false)}>Cancel</button>
              <button onClick={deletePost}>Delete</button>
            </div>
          </div>
       </Modal>
       
    </div>
  )
}

export default Post