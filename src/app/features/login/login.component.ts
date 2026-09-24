import { AuthService } from './../../core/services/auth.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private AuthService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

onSubmit(): void {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isLoading = true;
  this.errorMessage = null;

  this.AuthService.login(this.loginForm.value).subscribe({
    next: (res) => {
      this.isLoading = false;
      if (res.succeeded) {
        this.router.navigate(['/control-panel']);
      } else {
        this.errorMessage = res.message || 'تعذر تسجيل الدخول';
      }
    },
    error: (err) => {
      this.isLoading = false;
      // قراءة رسالة الخطأ في حال كانت راجعة من الباك إند
      this.errorMessage = err.error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
  });
}
}