import Modal from './Modal'
import {AddAPhotoOutlined, CloseOutlined} from '@mui/icons-material';
import { TextField, Button } from "@mui/material";
import { useEffect, useState } from 'react';
import { useUpdateUserMutation } from '../redux/services/user';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export default function EditProfile({ 
  setIsEditOpen, 
  coverImage, 
  profileImage, 
  isEditOpen, 
  name,  
  bio, 
  profileImageRef, 
  coverImageRef,
  coverPic,
  profilePic,
  setProfilePic,
  setCoverPic,
  setEditIsLoading,
  editIsLoading
}) {
  
  const [updateUser] = useUpdateUserMutation()

  const [inputs, setInputs] = useState({username: '', bio: ''}) 

  useEffect(() => {
    if(name) {
      setInputs({username: name, bio: bio})
    }
  }, [name, bio])

  useEffect(() => {
    if(isEditOpen) {
      setCoverPic(coverImage)
      setProfilePic(profileImage)
    }
  }, [isEditOpen, coverImage, profileImage, setCoverPic, setProfilePic])

  // function to remove image from state and input field
  const removeImage = () => {
    setCoverPic({url: '', filename: ''})
    setProfilePic({url: '', filename: ''})
  }
 
  // delete old image from firebase storage when user changes profile or cover image
  const deleteFromFirebase = async (filename) => {
    const desertRef = ref(storage, `weConect/${filename}`)
    await deleteObject(desertRef)
  }

  // upload cover image and profile image to firebase storage if they are set in the file input
  const uploadToFirebase = async (imageRef, picObject) => {
    setEditIsLoading(true)
    if (imageRef.current.files && imageRef.current.files[0]) {
      if(imageRef.current.files[0]['type'].split('/')[0] === 'image') {
        const file = imageRef.current.files[0];
        const filename = file.name + Date.now()
        const storageRef = ref(storage, `weConect/${filename}`)
        const snapshot = await uploadBytes(storageRef, file)
        const url = await getDownloadURL(snapshot.ref)
        return {
          filename,
          url
        } 
      }
    }
    return {
      filename: picObject.filename,
      url: picObject.url
    }
  }

  const editUser = async (e) => {
    e.stopPropagation();
    setIsEditOpen(false)
    let profileImgRes = {url: profilePic.url, filename: profilePic.filename}
    let coverImgRes = {url: coverPic.url, filename: coverPic.filename}

    // upload to firebase storage only when the profile images has been modified
    if(profilePic.filename === '' && profilePic.url !== profileImage.url) {
      profileImgRes = await uploadToFirebase(profileImageRef, profilePic)
    }
    
    // upload to firebase storage only when the cover images has been modified
    if(coverPic.filename === '' && coverPic.url !== coverImage.url) {
      coverImgRes = await uploadToFirebase(coverImageRef, coverPic)
    }

    await updateUser({
      username: inputs.username,
      bio: inputs.bio,
      coverPicture: coverImgRes,
      profilePicture: profileImgRes
    })
    
    setEditIsLoading(false)

    if(coverPic.filename === '' && coverPic.filename !== coverImage.filename) {
      await deleteFromFirebase(coverImage.filename)
    }
    if(profilePic.filename === '' && profilePic.filename !== profileImage.filename) {
     await deleteFromFirebase(profileImage.filename)
    }
    removeImage()
  }

  const closeModal = (e) => {
    setIsEditOpen(false); 
    removeImage()
  }

  return (
    <Modal
      open={isEditOpen}
      onClose={closeModal}
      modalLable='Edit profile'
      custom_modal='profileCard__editModal'
    >
      <div className="profileCard__edit">
        <div className="profileCard__edit__head">
          <div>
            <CloseOutlined onClick={(e) => {e.stopPropagation(); closeModal(e)}} className='close'/>
            <h3>Edit profile</h3>
          </div>
          <Button 
            variant="contained" 
            onClick={editUser} 
            disabled={editIsLoading}
            style={{
              backgroundColor:`${editIsLoading ? 'gray' : 'var(--p-color1)'}`,
              color: `${editIsLoading && 'white'}`
            }}>
              {editIsLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div className="profileCard__edit__coverImage">
          <img
            src={coverPic?.url ? coverPic?.url : "/assets/noCover.avif"}
            alt="cover"
          />
          <div className="profileCard__edit__coverImage__icons">
            <AddAPhotoOutlined onClick={(e) => { e.stopPropagation(); coverImageRef.current.click()}}/>
            {coverPic?.url &&
              <CloseOutlined onClick={(e) => {e.stopPropagation(); setCoverPic({url: '', filename: ''}); coverImageRef.current.value = '' }} />
            }
          </div>
        </div>
        <div className="profileCard__profileImage">
          <img
            src={profilePic?.url ? profilePic?.url : "/assets/noProfile.jpg"}
            alt="profile"
          />
          <div className="profileCard__edit__coverImage__icons mod">
            <AddAPhotoOutlined onClick={(e) => {e.stopPropagation(); profileImageRef.current.click()}} />
            {profilePic?.url &&
              <CloseOutlined onClick={(e) => {e.stopPropagation(); setProfilePic({url: '', filename: ''}); profileImageRef.current.value = '' }} />
            }
          </div>
        </div>
        <div className="profileCard__editInputs">
          <TextField 
            id="outlined-basic" 
            label="username" 
            value={inputs.username}
            onChange={(e) => setInputs({...inputs, username: e.target.value})}
          />
          <TextField 
            id="outlined-basic" 
            label="bio" 
            variant="outlined"
            value={inputs.bio}
            onChange={(e) => setInputs({...inputs, bio: e.target.value})}
            multiline
            rows={2}
          />
        </div>
      </div>
    </Modal>
  )
}
