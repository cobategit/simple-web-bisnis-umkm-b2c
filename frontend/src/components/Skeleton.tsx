import type { CSSProperties, HTMLAttributes } from 'react'

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  circle?: boolean
}

export function Skeleton({
  width,
  height,
  borderRadius,
  circle,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const customStyle: CSSProperties = {
    width: width ?? (circle ? height : '100%'),
    height: height ?? '1rem',
    borderRadius: circle ? '50%' : (borderRadius ?? '8px'),
    ...style,
  }

  return (
    <div
      className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={customStyle}
      aria-hidden='true'
      {...props}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className='product-card skeleton-card'>
      <Skeleton height={210} borderRadius='0' />
      <div className='card-body'>
        <Skeleton width={80} height={22} borderRadius={999} />
        <Skeleton width='85%' height={24} style={{ margin: '14px 0 8px' }} />
        <Skeleton width='95%' height={16} style={{ marginBottom: 6 }} />
        <Skeleton width='65%' height={16} style={{ marginBottom: 18 }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <Skeleton width={110} height={20} />
          <Skeleton width={90} height={16} />
        </div>
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <section className='product-detail-hero'>
      <div className='container'>
        <div className='product-breadcrumb' style={{ marginBottom: 28 }}>
          <Skeleton width={60} height={16} />
          <span>/</span>
          <Skeleton width={140} height={16} />
        </div>
        <div className='product-detail-grid'>
          <div className='product-gallery'>
            <Skeleton height={520} borderRadius={28} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Skeleton width={80} height={80} borderRadius={14} />
              <Skeleton width={80} height={80} borderRadius={14} />
              <Skeleton width={80} height={80} borderRadius={14} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Skeleton width={90} height={24} borderRadius={999} />
              <Skeleton
                width='80%'
                height={38}
                style={{ margin: '14px 0 10px' }}
              />
              <Skeleton width='100%' height={18} style={{ marginBottom: 6 }} />
              <Skeleton width='90%' height={18} />
            </div>
            <div
              style={{
                padding: '24px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
              }}
            >
              <Skeleton width={120} height={14} style={{ marginBottom: 8 }} />
              <Skeleton width={180} height={32} style={{ marginBottom: 16 }} />
              <Skeleton height={46} borderRadius={14} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              <div
                style={{
                  padding: 18,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                }}
              >
                <Skeleton width={70} height={14} style={{ marginBottom: 10 }} />
                <Skeleton width='80%' height={16} style={{ marginBottom: 6 }} />
                <Skeleton width='60%' height={16} />
              </div>
              <div
                style={{
                  padding: 18,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                }}
              >
                <Skeleton width={70} height={14} style={{ marginBottom: 10 }} />
                <Skeleton width='85%' height={16} style={{ marginBottom: 6 }} />
                <Skeleton width='70%' height={16} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ArticleCardSkeleton() {
  return (
    <div
      className='article-card skeleton-card'
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      <Skeleton height={190} borderRadius='0' />
      <div style={{ padding: 22 }}>
        <Skeleton width='85%' height={24} style={{ marginBottom: 10 }} />
        <Skeleton width='100%' height={16} style={{ marginBottom: 6 }} />
        <Skeleton width='70%' height={16} />
      </div>
    </div>
  )
}

export function ArticleDetailSkeleton() {
  return (
    <article className='article-detail container page-top'>
      <Skeleton width={140} height={18} style={{ marginBottom: 20 }} />
      <Skeleton
        width={70}
        height={20}
        borderRadius={999}
        style={{ marginBottom: 12 }}
      />
      <Skeleton width='75%' height={42} style={{ marginBottom: 16 }} />
      <Skeleton width='90%' height={20} style={{ marginBottom: 24 }} />
      <Skeleton height={380} borderRadius={20} style={{ marginBottom: 32 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton width='100%' height={18} />
        <Skeleton width='98%' height={18} />
        <Skeleton width='92%' height={18} />
        <Skeleton width='96%' height={18} />
        <Skeleton width='60%' height={18} style={{ marginBottom: 16 }} />
        <Skeleton width='100%' height={18} />
        <Skeleton width='94%' height={18} />
        <Skeleton width='85%' height={18} />
      </div>
    </article>
  )
}

export function ReviewCardSkeleton() {
  return (
    <blockquote
      className='skeleton-card'
      style={{ padding: 22, borderRadius: 20 }}
    >
      <Skeleton width={100} height={18} style={{ marginBottom: 12 }} />
      <Skeleton width='95%' height={16} style={{ marginBottom: 6 }} />
      <Skeleton width='80%' height={16} style={{ marginBottom: 16 }} />
      <Skeleton width={110} height={16} />
    </blockquote>
  )
}
