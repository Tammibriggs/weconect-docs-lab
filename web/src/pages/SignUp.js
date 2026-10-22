import { Link } from 'react-router-dom'
import '../styles/auth.css'
import { useRegisterMutation } from "../redux/services/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SignUp() {

  const [inputs, setInputs] = useState({username: '', password: '', password1: ''})
  const [register, result] = useRegisterMutation()
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault()
    const response = await register(inputs)
    if(response.data) {
      navigate('/login')
    }
  }

  return (
    <div className="a-right">
      <form className="infoForm authForm" onSubmit={handleSubmit}>
        <h3>Sign up</h3>
        <div>
          <input
            type="text"
            value={inputs.username}
            onChange={(e) => setInputs({...inputs, username: (e.target.value)})}
            className="infoInput"
            name="username"
            placeholder="Usernames"
          />
        </div>

        <div>
          <input
            type="password"
            className="infoInput"
            value={inputs.password}
            onChange={(e) => setInputs({...inputs, password: (e.target.value)})}
            name="password"
            placeholder="Password"
            min={5}
          />
          <input
            type="password"
            className="infoInput"
            value={inputs.password1}
            onChange={(e) => setInputs({...inputs, password1: (e.target.value)})}
            name="confirmpass"
            placeholder="Confirm Password"
            min={5}
          />
        </div>
        {result.error && 
          <p className="error">{result.error?.data ? result.error.data.message : 'Something went wrong'}</p>
        }
        <div>
          <span style={{fontSize: '12px'}}>Already have an account. <Link to='/login'>Login</Link></span>
        </div>
        <button className="button infoButton" disabled={result.isLoading} type="submit">
          Signup
        </button>
      </form>
    </div>
  );

}
