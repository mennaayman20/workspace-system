export interface LoginUserCommand {
  email: string;
  password: string;
}

// شكل البيانات الداخلية لحساب المستخدم والتوكن
export interface AuthData {
  message: string;
  isAuthenticated: boolean;
  accessToken: string;
  refreshTokenExpiration: string;
}

// الـ Response الرئيسي المغلف من الباك إند
export interface AuthResponse {
  succeeded: boolean;
  message: string;
  data: AuthData;
  meta: any;
}