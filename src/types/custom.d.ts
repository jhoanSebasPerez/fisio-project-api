declare module '@/components/not-found' {
  interface NotFoundProps {
    message?: string;
  }
  
  const NotFound: React.FC<NotFoundProps>;
  export default NotFound;
}

declare module '@/components/access-denied' {
  interface AccessDeniedProps {
    message?: string;
  }
  
  const AccessDenied: React.FC<AccessDeniedProps>;
  export default AccessDenied;
}

declare module '@/components/loading' {
  interface LoadingProps {
    message?: string;
    className?: string;
  }
  
  const Loading: React.FC<LoadingProps>;
  export default Loading;
}
