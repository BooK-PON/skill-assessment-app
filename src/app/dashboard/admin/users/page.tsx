'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Skeleton from '@/components/ui/Skeleton'
import { Users, Shield, GraduationCap, School, CheckCircle2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  fullname?: string
  role: string
  created_at: string
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; currentRole: string; newRole: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError('ไม่สามารถดึงข้อมูลผู้ใช้งานได้: ' + error.message)
    } else if (data) {
      setUsers(data)
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  // ฟังก์ชันเปลี่ยน Role ผู้ใช้งาน (เรียกผ่าน ConfirmDialog)
  const performRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId)
    setConfirmTarget(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast('เกิดข้อผิดพลาดในการอัปเดต Role: ' + error.message, 'error')
    } else {
      // บันทึก activity log
      await supabase.from('activity_logs').insert([
        {
          user_id: currentUserId,
          action: 'change_role',
          target_type: 'profile',
          target_id: userId,
          detail: `เปลี่ยนบทบาทเป็น ${newRole}`,
        },
      ]).then(() => {})
      fetchUsers()
    }
    setUpdatingId(null)
  }

  const handleRoleChangeRequest = (userId: string, newRole: string, currentRole: string) => {
    // ป้องกันไม่ให้ admin ลดระดับตัวเอง
    if (userId === currentUserId && newRole !== 'admin') {
      toast('คุณไม่สามารถลดระดับสิทธิ์ของตัวเองได้', 'warning')
      return
    }
    setConfirmTarget({ id: userId, currentRole, newRole })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Title Bar */}
        <div className="border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-600" /> แผงควบคุมผู้ดูแลระบบ (Admin User Management)
          </h1>
          <p className="text-secondary text-sm mt-1">จัดการรายชื่อผู้ใช้งานและกำหนดสิทธิ์การใช้งานระบบ (ผู้เรียน / ผู้สอน / ผู้ดูแลระบบ)</p>
        </div>

        {/* Error banner */}
        {error && (
          <div role="alert" className="bg-rose-500/10 border border-rose-500/50 rounded-lg p-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* User Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">ผู้เรียนทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'student' || !u.role).length} คน
              </p>
            </div>
            <GraduationCap className="w-8 h-8 text-blue-600/30" />
          </div>

          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">ผู้สอนทั้งหมด</p>
              <p className="text-2xl font-bold text-purple-600">
                {users.filter(u => ['instructor', 'teacher'].includes(u.role)).length} คน
              </p>
            </div>
            <School className="w-8 h-8 text-purple-600/30" />
          </div>

          <div className="bg-white border border-border p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">ผู้ดูแลระบบ</p>
              <p className="text-2xl font-bold text-rose-600">
                {users.filter(u => u.role === 'admin').length} คน
              </p>
            </div>
            <Shield className="w-8 h-8 text-rose-600/30" />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-ink min-w-[640px]">
            <thead className="bg-surface text-secondary text-xs uppercase border-b border-border">
              <tr>
                <th className="p-4">ชื่อ - นามสกุล</th>
                <th className="p-4">อีเมล / ID</th>
                <th className="p-4">สิทธิ์ปัจจุบัน (Role)</th>
                <th className="p-4 text-center">ปรับเปลี่ยนสิทธิ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-surface transition">
                  <td className="p-4 font-medium text-ink">
                    {user.fullname || 'ไม่ระบุชื่อ'}
                  </td>
                  <td className="p-4 text-secondary text-xs font-mono">
                    {user.email || user.id}
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      user.role === 'admin'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : user.role === 'instructor' || user.role === 'teacher'
                        ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                    }`}>
                      {user.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : user.role === 'instructor' || user.role === 'teacher' ? 'ผู้สอน (Instructor)' : 'ผู้เรียน (Student)'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <select
                      value={user.role === 'instructor' ? 'teacher' : (user.role || 'student')}
                      disabled={updatingId === user.id}
                      onChange={(e) => handleRoleChangeRequest(user.id, e.target.value, user.role || 'student')}
                      className="bg-white border border-border rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-primary-dark cursor-pointer disabled:opacity-50"
                    >
<option value="student">ผู้เรียน (Student)</option>
                        <option value="teacher">ผู้สอน (Instructor)</option>
                        <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Confirm Role Change Modal */}
        {confirmTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
              <div className="border-b border-border pb-3">
                <h3 className="font-bold text-lg text-ink">ยืนยันการเปลี่ยนสิทธิ์</h3>
              </div>
              <p className="text-sm text-ink">
                ต้องการเปลี่ยนบทบาทจาก{' '}
                <span className="font-semibold text-rose-600">
                  {confirmTarget.currentRole === 'admin' ? 'ผู้ดูแลระบบ' : confirmTarget.currentRole === 'instructor' || confirmTarget.currentRole === 'teacher' ? 'ผู้สอน' : 'ผู้เรียน'}
                </span>{' '}
                เป็น{' '}
                <span className="font-semibold text-emerald-600">
                  {confirmTarget.newRole === 'admin' ? 'ผู้ดูแลระบบ' : confirmTarget.newRole === 'instructor' || confirmTarget.newRole === 'teacher' ? 'ผู้สอน' : 'ผู้เรียน'}
                </span>{' '}
                ใช่หรือไม่?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2 rounded-lg text-sm bg-white border border-border text-secondary hover:bg-surface"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => performRoleChange(confirmTarget.id, confirmTarget.newRole)}
                  className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary-dark text-ink font-medium"
                >
                  ยืนยันเปลี่ยนสิทธิ์
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
