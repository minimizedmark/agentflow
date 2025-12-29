import { supabase } from './supabase/client'

export interface SignUpData {
  email: string
  password: string
  name: string
  companyName?: string
  phone?: string
}

export interface SignInData {
  email: string
  password: string
}

export async function signUp(data: SignUpData) {
  const { email, password, name, companyName, phone } = data

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        company_name: companyName,
        phone,
      },
    },
  })

  if (error) throw error

  // Create user record in users table
  if (authData.user) {
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: authData.user.email,
      name,
      company_name: companyName,
      phone,
      current_plan: 'trial',
      monthly_call_limit: 50,
      is_active: true,
    })

    if (profileError) throw profileError
  }

  return authData
}

export async function signIn(data: SignInData) {
  const { email, password } = data

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return authData
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error

  return data
}
