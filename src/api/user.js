import request from '@/utils/request'

export function sendCode(phone) {
  return request({
    url: '/public/user/code',
    method: 'post',
    data: { phone }
  })
}

export function login(data) {
  return request({
    url: '/public/user/login',
    method: 'post',
    data
  })
}