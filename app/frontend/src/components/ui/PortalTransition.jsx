import { createContext, useCallback, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const PortalTransitionContext = createContext(null);

export function PortalTransitionProvider({ children }) {
  const navigate = useNavigate();

  const startPortalTransition = useCallback((to, options = {}) => {
    const { replace = false } = options;
    navigate(to, { replace });
  }, [navigate]);

  const value = useMemo(() => ({ startPortalTransition }), [startPortalTransition]);

  return (
    <PortalTransitionContext.Provider value={value}>
      {children}
    </PortalTransitionContext.Provider>
  );
}

export function usePortalTransition() {
  const context = useContext(PortalTransitionContext);

  if (!context) {
    throw new Error("usePortalTransition must be used inside PortalTransitionProvider");
  }

  return context;
}

export function PortalLink({ to, replace = false, label, onClick, children, ...props }) {
  const { startPortalTransition } = usePortalTransition();

  function handleClick(event) {
    onClick?.(event);

    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.altKey
      || event.ctrlKey
      || event.shiftKey
      || props.target === "_blank"
    ) {
      return;
    }

    event.preventDefault();
    startPortalTransition(to, { replace, label });
  }

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
