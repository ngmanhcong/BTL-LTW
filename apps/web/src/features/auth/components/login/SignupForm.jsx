import React, { useState, useRef } from 'react';
import styles from './SignupForm.module.css';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import SignupInput from 'shared/components/inputs/signup/index';
import DateSelector from './DateSelector';
import GenderSelector from './GenderSelector';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { login } from 'app/slices/userSlice';
import { useNavigate } from 'react-router-dom';
import Card from 'shared/components/ui/Card/Card';
import FormLoader from 'shared/components/FormLoader/index';
import useOnClickOutside from 'shared/hooks/useOnClickOutside';
import { nameValidation } from 'shared/lib/nameValidation';

function SignupForm({ setRenderSignUp, renderSignUp }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const signUpRef = useRef();
  const userInfos = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    birth_Year: new Date().getFullYear(),
    birth_Month: new Date().getMonth() + 1,
    birth_Day: new Date().getDay(),
    gender: '',
  };
  const [genderError, setGenderError] = useState(true);
  const [dateError, setDateError] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    first_name,
    last_name,
    email,
    password,
    passwordConfirm,
    birth_Year,
    birth_Month,
    birth_Day,
    gender,
  } = userInfos;

  const signupValidation = Yup.object({
    first_name: nameValidation,
    last_name: nameValidation,
    email: Yup.string()
      .required('Email được dùng để đăng nhập và khôi phục mật khẩu.')
      .email('Địa chỉ email không hợp lệ.')
      .max(100),
    password: Yup.string()
      .required('Vui lòng nhập mật khẩu')
      .min(6)
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#_$%^&*])(?=.{6,})/,
        'Mật khẩu phải có ít nhất một chữ thường, một chữ hoa, một chữ số và một ký tự đặc biệt'
      ),
    passwordConfirm: Yup.string().test(
      'passwords-match',
      'Mật khẩu nhập lại không khớp!',
      function (value) {
        return this.parent.password === value;
      }
    ),
    gender: Yup.string().required('Vui lòng chọn giới tính'),
  });

  const submitHandler = async (values) => {
    try {
      setLoading(true);
      const { data } = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/v1/users/signup`,
        {
          first_name: nameValidation.cast(values.first_name),
          last_name: nameValidation.cast(values.last_name),
          email: values.email,
          password: values.password,
          passwordConfirm: values.passwordConfirm,
          birth_Year: values.birth_Year,
          birth_Month: values.birth_Month,
          birth_Day: values.birth_Day,
          gender: values.gender,
        },
        {
          withCredentials: true,
        }
      );
      setError('');
      setSuccess(data.status);
      dispatch(login(data));
      setTimeout(() => {
        setLoading(false);
        navigate('/');
      }, 2000);
    } catch (error) {
      setLoading(false);
      setSuccess('');
      setError(error.response.data.message);
    }
  };

  useOnClickOutside(signUpRef, renderSignUp, () => {
    setRenderSignUp(false);
  });

  return (
    <div className="blur">
      <Card className={styles.signup} innerRef={signUpRef}>
        <div className={styles.signup_header}>
          <i onClick={() => setRenderSignUp(false)} className="exit_icon"></i>
          <span>Tạo tài khoản PTITSocial</span>
          <span>Bắt đầu kết nối với cộng đồng sinh viên.</span>
        </div>
        <Formik
          enableReinitialize
          validationSchema={signupValidation}
          initialValues={{
            first_name,
            last_name,
            email,
            password,
            passwordConfirm,
            birth_Year,
            birth_Month,
            birth_Day,
            gender,
          }}
          onSubmit={(values) => {
            let current_date = new Date();

            const picked_date = new Date(
              values.birth_Year,
              values.birth_Month - 1,
              values.birth_Day
            );

            let atleast14 = new Date(1970 + 14, 0, 1);
            let noMoreThan70 = new Date(1970 + 70, 0, 1);
            if (current_date - picked_date < atleast14) {
              setDateError(
                'Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày sinh thực tế của bạn.'
              );
            } else if (current_date - picked_date > noMoreThan70) {
              setDateError(
                'Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày sinh thực tế của bạn.'
              );
            } else {
              setDateError(false);
              setGenderError(false);
              submitHandler(values);
            }
          }}
        >
          {(formik) => {
            return (
              <Form className={styles.form} noValidate>
                <FormLoader loading={loading}>
                  <div className={styles.line}>
                    <SignupInput
                      type="text"
                      placeholder="Tên"
                      name="first_name"
                      disabled={loading}
                    />

                    <SignupInput
                      dir="right"
                      type="text"
                      placeholder="Họ và tên đệm"
                      name="last_name"
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.line}>
                    <SignupInput
                      type="email"
                      placeholder="Địa chỉ email"
                      name="email"
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.line}>
                    <SignupInput
                      type="password"
                      placeholder="Mật khẩu"
                      name="password"
                      disabled={loading}
                    />
                  </div>
                  <div className={styles.line}>
                    <SignupInput
                      type="password"
                      placeholder="Nhập lại mật khẩu"
                      name="passwordConfirm"
                      disabled={loading}
                    />
                  </div>
                  <DateSelector
                    birth_Day={birth_Day}
                    birth_Month={birth_Month}
                    birth_Year={birth_Year}
                    disabled={loading}
                    dateError={dateError}
                  />

                  <GenderSelector disabled={loading} genderError={genderError} />
                </FormLoader>
                <div className={styles.info}>
                  Bạn cần xác minh địa chỉ email sau khi đăng ký để sử dụng PTITSocial.
                </div>

                <div className={styles.btn_wrap}>
                  <button type="submit" disabled={loading} className="btn_blue">
                    Đăng ký
                  </button>
                </div>
                {error && <div className={styles.error_text}>{error}</div>}
                {success && <div className={styles.success_text}>{success}</div>}
              </Form>
            );
          }}
        </Formik>
      </Card>
    </div>
  );
}

export default SignupForm;
