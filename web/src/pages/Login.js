import { Link } from "react-router-dom";
import '../styles/auth.css'
import { useLoginMutation } from "../redux/services/auth";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setCredentials } from "../redux/authSlice";
import { useNavigate } from "react-router-dom";

export default function Login() {

  const [inputs, setInputs] = useState({username: '', password: ''})
  const [login, result] = useLoginMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const response = await login(inputs)
    if(response.data) {
      const {accessToken, ...others} = response.data.data
      dispatch(setCredentials({user:others, token: accessToken}))
      navigate('/')
    }
  }

  return (
    <div className="a-right">
      <form className="infoForm authForm" onSubmit={handleSubmit}>
        <h3>Log In</h3>
        <div>
          <input
            type="text"
            placeholder="Username"
            className="infoInput"
            value={inputs.username}
            onChange={(e) => setInputs({...inputs, username:(e.target.value)})}
            name="username"
          />
        </div>

        <div>
          <input
            type="password"
            className="infoInput"
            placeholder="Password"
            value={inputs.password}
            onChange={(e) => setInputs({...inputs, password:(e.target.value)})}
            name="password"
          />
        </div>
        {result.error && 
          <p className="error">{result.error?.data ? result.error.data.message : 'Something went wrong'}</p>
        }
        <div>
          <span style={{ fontSize: "12px" }}>
            Don't have an account <Link to='/signup'>SignUp</Link>
          </span>
          <button className="button infoButton" disabled={result.isLoading}>
            Login
          </button>
        </div>
      </form>
    </div>
  );
}
