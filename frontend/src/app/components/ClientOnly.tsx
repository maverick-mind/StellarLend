"use client";

import React, { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }} />
    );
  }

  return <>{children}</>;
}
