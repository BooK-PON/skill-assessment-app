'use client'

import '@/components/auth/animations-split.css'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogIn, UserPlus, BookOpen, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'
import Auth3DHero from '@/components/auth/Auth3DHero'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullname, setFullname] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message === 'Invalid login credentials'
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            : error.message)
          setLoading(false)
          return
        }

        router.push('/dashboard')
        router.refresh()
      }
      else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              fullname,
            },
          },
        })

        if (error) throw error

        setSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ')
        setIsLogin(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error && err.message
        ? err.message
        : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-login grid min-h-screen bg-white lg:grid-cols-[55fr_45fr]">
      {/* Form Panel */}
      <div className="order-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
        <div className="login-card w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex justify-center">
            <div className="play-btn rounded-xl bg-primary-light p-3 text-primary-dark">
              <BookOpen className="play-nudge h-10 w-10" />
            </div>
          </div>

          <h2 className="mb-2 text-center text-2xl font-bold text-ink">
            {isLogin ? 'เข้าสู่ระบบประเมินทักษะ' : 'สร้างบัญชีผู้ใช้งานใหม่'}
          </h2>
          <p className="mb-6 text-center text-sm text-secondary">
            {isLogin ? 'ระบบประเมินทักษะการเรียนรู้สำหรับนักเรียน' : 'กรอกข้อมูลเพื่อลงทะเบียนเข้าใช้งาน'}
          </p>

          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div role="status" className="mb-4 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
              {success}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <Field label="ชื่อ - นามสกุล" htmlFor="fullname" required>
                <Input
                  id="fullname"
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="นายเรียนดี ขยันเรียน"
                />
              </Field>
            )}

            <Field label="อีเมล (Email)" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
            </Field>

            <Field label="รหัสผ่าน (Password)" htmlFor="password" required>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-secondary transition-colors hover:bg-surface hover:text-ink"
                >
                  {showPassword ? <EyeOff className="play-icon h-5 w-5" /> : <Eye className="play-icon h-5 w-5" />}
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" loading={loading} className="play-btn w-full">
              {isLogin ? (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="play-nudge h-5 w-5" />
                  <span>เข้าสู่ระบบ</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="play-nudge h-5 w-5" />
                  <span>ลงทะเบียน</span>
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
                setSuccess(null)
              }}
              className="text-sm text-primary-dark hover:underline"
            >
              {isLogin ? 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Panel */}
      <div className="order-2 border-t border-border lg:border-l lg:border-t-0">
        <Auth3DHero />
      </div>
    </div>
  )
}