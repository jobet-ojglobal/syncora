// import "./test-sync.worker";

// Only initialize workers in server-side runtime, not during build
if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
  import("./sync.worker").catch(() => {});
  import("./partner.worker").catch(() => {});
  import("./mid.worker").catch(() => {});
  import("./cloud.worker").catch(() => {});

  console.log("All workers started");
}
