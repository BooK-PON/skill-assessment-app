import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value }) =>
            supabaseResponse.cookies.set(name, value)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname.startsWith('/dashboard')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const isStaff = ['admin', 'instructor', 'teacher'].includes(role)

    if (pathname.startsWith('/dashboard/admin') && !isStaff) {
      return NextResponse.redirect(new URL('/dashboard/student/courses', request.url))
    }

    if (pathname.startsWith('/dashboard/instructor') && !isStaff) {
      return NextResponse.redirect(new URL('/dashboard/student/courses', request.url))
    }

    if (pathname.startsWith('/dashboard/student') && isStaff) {
      return NextResponse.redirect(new URL('/dashboard/instructor/courses', request.url))
    }

    const isCoursePath = pathname.startsWith('/dashboard/student/courses/')
    const isQuizPath = pathname.startsWith('/dashboard/student/quiz/')
    if (role === 'student' && !isStaff && (isCoursePath || isQuizPath)) {
      const rest = isCoursePath
        ? pathname.slice('/dashboard/student/courses/'.length)
        : pathname.slice('/dashboard/student/quiz/'.length)
      if (rest && rest !== 'browse') {
        const courseId = rest.split('/')[0]
        if (courseId) {
          const { data: enrollment } = await supabase
            .from('enrollments')
            .select('enrollment_id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single()

          if (!enrollment) {
            return NextResponse.redirect(
              new URL('/dashboard/student/courses/browse', request.url)
            )
          }
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
