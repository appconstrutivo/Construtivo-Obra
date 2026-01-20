"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function PathDataAttribute() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (document && document.body) {
      document.body.setAttribute("data-path", pathname);
    }
    
    return () => {
      if (document && document.body) {
        document.body.removeAttribute("data-path");
      }
    };
  }, [pathname, isMounted]);

  return null;
} 