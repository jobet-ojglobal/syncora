If you intentionally want to use `any` and suppress the ESLint warning, you have several options.

For a **single line**:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
payload: any;
```

Example:

```ts
interface MidWebhookJobData {
  source: string;
  model: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;

  timestamp: string;
}
```

For an entire block or interface:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */

interface MidWebhookJobData {
  source: string;
  model: string;
  payload: any;
  timestamp: string;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
```

For a whole file:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// file contents...
```

Or you can configure ESLint globally in your ESLint config:

```js
rules: {
  "@typescript-eslint/no-explicit-any": "off",
}
```

or make it a warning instead of an error:

```js
rules: {
  "@typescript-eslint/no-explicit-any": "warn",
}
```

For most cases, the recommended approach is the inline suppression:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
payload: any;
```

because it documents that the use of `any` is intentional and keeps the rule active elsewhere in your codebase.
