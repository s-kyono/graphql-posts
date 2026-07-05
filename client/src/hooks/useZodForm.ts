import { useActionState, useReducer, useRef, useState } from "react";
import type { ZodSchema } from "zod";

type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

type FormState<T> = {
  errors: FieldErrors<T>;
  formError?: string;
  serverError?: string;
  values: Partial<Record<keyof T & string, string>>;
  // 成功/失敗の「回数」を持たせ、呼び出し側で前回値と比較するだけで
  // 1回のイベントとして検知できるようにする（トースト発火などの副作用に使う）
  _successCount: number;
  _errorCount: number;
};

// ローカル state を useReducer で一本化
// → reset が単一 dispatch で完結し、余分なレンダリングを防ぐ
type LocalState<T> = {
  touched: Set<string>;
  clientErrors: FieldErrors<T>;
  clientFormError: string | undefined;
  liveValues: Partial<Record<keyof T & string, string>>;
};

type LocalAction<T> =
  | { type: "touch"; name: string }
  | { type: "touchAndValidate"; name: string; errors: FieldErrors<T>; formError?: string }
  | { type: "validate"; errors: FieldErrors<T>; formError?: string }
  | { type: "setLiveValue"; name: string; value: string };

function createLocalReducer<T>() {
  return (state: LocalState<T>, action: LocalAction<T>): LocalState<T> => {
    switch (action.type) {
      case "touch":
        return { ...state, touched: new Set([...state.touched, action.name]) };
      case "touchAndValidate":
        return {
          ...state,
          touched: new Set([...state.touched, action.name]),
          clientErrors: action.errors,
          clientFormError: action.formError,
        };
      case "validate":
        return { ...state, clientErrors: action.errors, clientFormError: action.formError };
      case "setLiveValue":
        return { ...state, liveValues: { ...state.liveValues, [action.name]: action.value } };
    }
  };
}

const emptyLocal = <T>(): LocalState<T> => ({
  touched: new Set(),
  clientErrors: {},
  clientFormError: undefined,
  liveValues: {},
});

type Validators = {
  onChange?: boolean;
  onBlur?: boolean;
};

type UseZodFormOptions = {
  validators?: Validators;
};

const emptyForm = <T>(): FormState<T> => ({
  errors: {},
  formError: undefined,
  serverError: undefined,
  values: {},
  _successCount: 0,
  _errorCount: 0,
});

export function useZodForm<T>(
  schema: ZodSchema<T>,
  onValid: (data: T) => Promise<void>,
  options: UseZodFormOptions = {}
) {
  const { validators = { onBlur: true, onChange: false } } = options;

  const valuesRef = useRef<Partial<Record<string, string>>>({});
  const isSubmittingRef = useRef(false);
  const [local, dispatch] = useReducer(createLocalReducer<T>(), undefined, emptyLocal<T>);

  const action = async (
    prev: FormState<T>,
    formData: FormData
  ): Promise<FormState<T>> => {
    const raw = Object.fromEntries(formData.entries()) as Record<keyof T & string, string>;
    const result = schema.safeParse(raw);

    if (!result.success) {
      const errors: FieldErrors<T> = {};
      let formError: string | undefined;

      for (const issue of result.error.issues) {
        if (issue.path.length === 0) {
          formError ??= issue.message;
        } else {
          const key = issue.path[0] as keyof T & string;
          if (!errors[key]) errors[key] = issue.message;
        }
      }

      return {
        errors,
        formError,
        values: raw,
        _successCount: prev._successCount,
        _errorCount: prev._errorCount,
      };
    }

    // バリデーション通過後にのみ2重送信をガード
    if (isSubmittingRef.current) return prev;
    isSubmittingRef.current = true;

    try {
      await onValid(result.data);
      return {
        errors: {},
        formError: undefined,
        values: {},
        _successCount: prev._successCount + 1,
        _errorCount: prev._errorCount,
      };
    } catch (e) {
      const serverError = e instanceof Error ? e.message : "送信に失敗しました";
      return {
        errors: {},
        formError: undefined,
        serverError,
        values: raw,
        _successCount: prev._successCount,
        _errorCount: prev._errorCount + 1,
      };
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const [state, formAction, isPending] = useActionState(action, emptyForm<T>());

  // popupStatus はあくまで「直近のカウント」と「最後に dismiss した時点のカウント」の比較で決まる
  // 純粋な派生値 → effect での同期は一切不要（dispatch のタイミング待ちによるズレが原理的に発生しない）
  const [dismissedSuccessCount, setDismissedSuccessCount] = useState(0);
  const [dismissedErrorCount, setDismissedErrorCount] = useState(0);

  const popupStatus: "idle" | "loading" | "error" | "success" = isPending
    ? "loading"
    : state._errorCount > dismissedErrorCount
      ? "error"
      : state._successCount > dismissedSuccessCount
        ? "success"
        : "idle";

  const dismissPopup = () => {
    setDismissedSuccessCount(state._successCount);
    setDismissedErrorCount(state._errorCount);
  };

  const parseResult = (name: string, current: Record<string, string>) => {
    const result = schema.safeParse(current);
    if (result.success) return { errors: {} as FieldErrors<T>, formError: undefined };

    const errors: FieldErrors<T> = {};
    let formError: string | undefined;

    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        formError ??= issue.message;
      } else {
        const key = issue.path[0] as keyof T & string;
        if ((local.touched.has(key) || key === name) && !errors[key]) {
          errors[key] = issue.message;
        }
      }
    }

    return { errors, formError };
  };

  const register = (name: keyof T & string) => {
    return {
      name,
      defaultValue: state.values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        valuesRef.current[name] = value;

        if (validators.onChange) {
          const { errors, formError } = parseResult(name, { ...valuesRef.current } as Record<string, string>);
          dispatch({ type: "touchAndValidate", name, errors, formError });
        } else if (validators.onBlur && local.touched.has(name)) {
          const { errors, formError } = parseResult(name, { ...valuesRef.current } as Record<string, string>);
          dispatch({ type: "validate", errors, formError });
        } else {
          dispatch({ type: "setLiveValue", name, value });
        }
      },
      ...(validators.onBlur
        ? {
            onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
              const value = e.target.value;
              valuesRef.current[name] = value;
              const { errors, formError } = parseResult(name, { ...valuesRef.current } as Record<string, string>);
              dispatch({ type: "touchAndValidate", name, errors, formError });
            },
          }
        : {}),
    };
  };

  // touched フィールド → clientErrors を優先
  // 未タッチ → state.errors（サブミット時のエラー）
  const errors: FieldErrors<T> = {};
  for (const key of new Set([
    ...Object.keys(state.errors),
    ...Object.keys(local.clientErrors),
  ]) as Set<keyof T & string>) {
    errors[key] = local.touched.has(key) ? local.clientErrors[key] : state.errors[key];
  }

  const formError = local.touched.size > 0 ? local.clientFormError : state.formError;

  return {
    formAction,
    register,
    dismissPopup,
    formState: {
      errors,
      formError,
      serverError: state.serverError,
      values: local.liveValues,
      isPending,
      popupStatus,
    },
  };
}
