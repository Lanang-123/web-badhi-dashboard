// src/pages/Login.tsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import 'antd/dist/reset.css'
import { Card, Form, Input, Button } from 'antd'
import Swal from 'sweetalert2'
import useAuthStore from '../../store/useAuthStore'
import BadhiLogo from '../../assets/images/Badhi-Logo.png'
import BackgroundImage from '../../assets/images/bg-login.png'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const error = useAuthStore((state) => state.error)


  const handleLogin = async ({ username, password }: { username: string; password: string }) => {
    const success = await login(username, password)
    if (success) {
      await Swal.fire({
        icon: 'success',
        title: 'Login Berhasil',
        text: 'Anda akan diarahkan ke dashboard.',
        timer: 1500,
        showConfirmButton: false,
      })
      navigate('/dashboard', { replace: true })
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Login Gagal',
        text: error || 'Email atau password salah.',
      })
    }
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Background image */}
      <div
        style={{
          backgroundImage: `url(${BackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          zIndex: 0,
        }}
      />

      {/* White overlay */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          zIndex: 1,
        }}
      />

      {/* Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card
          style={{
            width: 400,
            textAlign: 'center',
            borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
            backgroundColor: 'white',
          }}
          cover={
            <img
              alt="Logo"
              src={BadhiLogo}
              style={{ width: '7rem', margin: '10px auto' }}
            />
          }
        >
          <h2 style={{ color: '#772d2f', margin: 0, fontWeight: 600 }}>
            BADHI ADMIN
          </h2>
          <p style={{ color: 'gray', fontSize: 12 }}>
            Welcome! Login dengan akun Anda untuk melanjutkan.
          </p>
          <Form layout='vertical' onFinish={handleLogin}>
            <Form.Item
              label='Email'
              name='username'
              rules={[{ required: true, message: 'Email wajib diisi' }]}
            >
              <Input placeholder='Masukkan email' />
            </Form.Item>
            <Form.Item
              label='Password'
              name='password'
              rules={[{ required: true, message: 'Password wajib diisi' }]}
            >
              <Input.Password placeholder='Masukkan password' />
            </Form.Item>
            <Form.Item>
              <Button
                type='primary'
                htmlType='submit'
                block
                loading={loading}
                style={{ backgroundColor: '#772d2f', borderColor: '#772d2f' }}
              >
                Login
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}

export default Login