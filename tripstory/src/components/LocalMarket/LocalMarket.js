// src/components/LocalMarket/LocalMarket.js
// v2.4: 배너 전구(방문 혜택 안내) 포털 팝오버 추가, 밖클릭/ESC 닫힘, 위치 고정
// - 팝오버는 document.body로 렌더되어 overflow에 절대 잘리지 않음
// - 기존 로직/스타일 유지, 변경 구간에 주석 표시

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './LocalMarket.css';
import api from '../../assets/api/index';

const REGIONS = [
  '서울특별시','인천광역시','경기도','강원도',
  '대전광역시','충청북도','충청남도',
  '광주광역시','전라북도','전라남도',
  '대구광역시','부산광역시','울산광역시',
  '경상북도','경상남도','제주특별자치도','세종특별자치시'
];

const SORT_OPTIONS = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '인기순' },
  { key: 'price-low', label: '기준가 낮은순' },
  { key: 'price-high', label: '기준가 높은순' },
  { key: 'discount', label: '혜택 큰순' },
];

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str){
  let r=''; for (let i=0;i<str.length;i++){ const c=str.charCodeAt(i)-44032; if(c>-1&&c<11172) r+=CHO[Math.floor(c/588)];}
  return r;
}
function matchesChosung(text, search){ if(!text||!search) return false; return getChosung(text).includes(search); }

const formatPrice = (price)=> (!price||price===0) ? '시가' : `${price.toLocaleString()}원`;

// 🔁 (기존 유지) 할인 가격 계산 유틸
const getDiscountPrice = (price, percent=10)=> (!price||price===0) ? 0 : Math.floor(price*(1-percent/100));

/* ===================== 🔔 방문 혜택 안내: 포털 팝오버 ===================== */
function BannerBenefitPopover({ anchor, onClose }){
  const popRef = useRef(null);

  useEffect(()=>{
    function onKey(e){ if(e.key === 'Escape') onClose(); }
    function onClickOutside(e){
      if (!popRef.current) return;
      if (!popRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return ()=> {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  },[onClose]);

  if(!anchor) return null;

  const maxWidth = 360;
  const top  = Math.max(12, anchor.top);
  const left = Math.max(12, Math.min(window.innerWidth - maxWidth - 12, anchor.left));

  return createPortal(
    <div
      ref={popRef}
      className="banner-help-pop"
      style={{ position:'fixed', top: `${top}px`, left: `${left}px`, maxWidth: `${maxWidth}px` }}
      role="dialog"
      aria-label="방문 혜택 안내"
    >
      <div className="banner-help-pop-head">🎁 방문 혜택 안내</div>
      <div className="banner-help-pop-body">
        <p className="banner-help-pop-desc">
          여행 기록과 방문 인증을 쌓으면 지역별 혜택 쿠폰이 열립니다. 쿠폰은 이 페이지에서 사용 처리할 수 있어요.
        </p>
        <ul className="benefit-steps">
          <li><span>신규 가입</span><strong>웰컴 5%</strong></li>
          <li><span>1회 방문</span><strong>10%</strong></li>
          <li><span>2회 방문</span><strong>7%</strong></li>
          <li><span>3회 방문</span><strong>10%</strong></li>
          <li><span>5회 방문</span><strong>12%</strong></li>
          <li><span>7회 방문</span><strong>15%</strong></li>
          <li><span>9회 방문</span><strong>20%</strong></li>
        </ul>
        <div className="banner-help-hint">
          💡 지역별 방문 횟수에 따라 단계가 따로 집계됩니다.
        </div>
      </div>
      <button className="banner-help-close" onClick={onClose} aria-label="닫기">✕</button>
      <span className="banner-help-arrow" aria-hidden="true" />
    </div>,
    document.body
  );
}
/* =================== // 방문 혜택 안내: 포털 팝오버 =================== */

/* =========================================================
   🎟️ 쿠폰 계산 (추가) — 지역별 보유 쿠폰의 '최대 할인율' 사용
   - 기존 UI/구조 변경 없음
   - 'issued' 상태는 스키마에 없으므로 제외 (active|used|expired만 존재)
   ========================================================= */
function useCouponHelpers(coupons){
  const activeCouponFor = useCallback((regionName)=>{
    return (coupons || [])
      .filter(c => c && c.region === regionName && c.status === 'active')
      .sort((a, b) => Number(b.discount || 0) - Number(a.discount || 0))[0] || null;
  },[coupons]);

  const discountPercentFor = useCallback((regionName)=>{
    return Number(activeCouponFor(regionName)?.discount || 0);
  },[activeCouponFor]);

  const hasCouponFor = useCallback((regionName)=>{
    return discountPercentFor(regionName) > 0;
  },[discountPercentFor]);

  return { activeCouponFor, discountPercentFor, hasCouponFor };
}

function ProductCard({ product, vendor, discountPercent, visitCount, onClick }) {
  const originalPrice   = product.price || 0;
  const hasDiscount     = discountPercent > 0 && originalPrice > 0;
  const discountPrice   = hasDiscount ? getDiscountPrice(originalPrice, discountPercent) : null;
  const visits          = visitCount || 0;

  return (
    <div className={`product-card ${hasDiscount ? 'has-coupon' : ''}`} onClick={() => onClick(product, vendor)}>
      {hasDiscount && <div className="product-badge-discount">🎫 {discountPercent}% 할인</div>}

      <div className="product-card-image">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> :
          <div className="product-card-placeholder">{product.tags?.[0] || '📦'}</div>}
        <div className="product-region-badge-image">{vendor.region}</div>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-title">{product.name}</h3>

        <div className="product-vendor">
          🏡 {vendor.name}
          {vendor.verified && <span className="cert-badge-mini">인증</span>}
        </div>

        <div className="product-rating">⭐ {vendor.rating?.toFixed(1) || '4.5'}</div>

        {!hasDiscount && (
          <div className="progress-steps-card">
            <div className="progress-steps-row">
              {[0,1,2,3,4].map(i=>(
                <span key={i} className={`step-box ${i < visits ? 'active' : ''}`} aria-label={`${i < visits ? '완료' : '미완료'} 단계`} />
              ))}
            </div>
            <div className="progress-steps-text">👣 {visits}/5회 방문</div>
          </div>
        )}

        <div className="product-price-section">
          {hasDiscount ? (
            <>
              <div className="price-label-text">💰 기준가</div>
              <div className="price-original-striked">{formatPrice(originalPrice)}</div>
              <div className="price-coupon-label">🎫 {discountPercent}% 혜택가</div>
              <div className="price-discount-huge">{formatPrice(discountPrice)}</div>
              <div className="price-save-text">{formatPrice(originalPrice - discountPrice)} 혜택</div>
            </>
          ) : (
            <>
              <div className="price-label-text">💰 기준가</div>
              <div className="price-normal-huge">{formatPrice(originalPrice)}</div>
            </>
          )}
        </div>
      </div>

      <button className="product-card-btn" onClick={(e)=>{ e.stopPropagation(); onClick(product, vendor); }}>
        혜택 보기
      </button>
    </div>
  );
}

function ProductDetailModal({ product, vendor, discountPercent, activeCoupon, redeeming, onRedeem, onClose }) {
  if (!product || !vendor) return null;

  const originalPrice = product.price || 0;
  const hasDiscount   = discountPercent > 0 && originalPrice > 0;
  const discountPrice = hasDiscount ? getDiscountPrice(originalPrice, discountPercent) : 0;
  const discountAmount= Math.max(0, originalPrice - discountPrice);
  const showNumeric   = originalPrice > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content product-modal" onClick={(e)=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="product-modal-grid">
          <div className="product-modal-image">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name}/> :
              <div className="product-modal-placeholder">📦 {product.name}</div>}
          </div>

          <div className="product-modal-info">
            <div className="product-modal-region">📍 {vendor.region}</div>
            <h2 className="product-modal-title">{product.name}</h2>

            <div className="product-modal-vendor">
              <div className="vendor-name-big">
                🏡 {vendor.name}
                {vendor.verified && <span className="cert-badge-big">정부/지자체 인증</span>}
              </div>
              <div className="vendor-rating-big">⭐ {vendor.rating?.toFixed(1) || '4.5'}</div>
            </div>

            {vendor.description && <div className="product-modal-desc">{vendor.description}</div>}

            {product.tags && product.tags.length > 0 && (
              <div className="product-modal-tags">
                {product.tags.map((tag,i)=>(<span key={i} className="tag-big">#{tag}</span>))}
              </div>
            )}

            {/* 💳 혜택 섹션: 가로 2열 + 예상 혜택 */}
            <div className="product-modal-price product-modal-price--row">
              <div className="price-col">
                <div className="price-label">💰 기준가</div>
                <div className="price-original-line">{formatPrice(originalPrice)}</div>
              </div>

              <div className="price-col">
                <div className="price-label-coupon">🎫 혜택 적용가 ({discountPercent || 0}%)</div>
                <div className="price-discount-inline">
                  {showNumeric ? formatPrice(hasDiscount ? discountPrice : originalPrice) : '혜택가 산정중'}
                </div>
              </div>
            </div>

            {showNumeric && hasDiscount && (
              <div className="price-save price-save-inline">예상 혜택: {formatPrice(discountAmount)}</div>
            )}

            {vendor.contact?.address && (
              <div className="product-modal-address">📍 {vendor.contact.address}</div>
            )}

            <div className="product-modal-actions">
              {activeCoupon ? (
                <button className="product-modal-buy-btn" onClick={onRedeem} disabled={redeeming}>
                  {redeeming ? '쿠폰 사용 처리 중...' : '쿠폰 사용하기'}
                </button>
              ) : vendor.contact?.url ? (
                <a href={vendor.contact.url} target="_blank" rel="noreferrer" className="product-modal-buy-btn">제휴처 보기</a>
              ) : (
                <button className="product-modal-buy-btn" disabled>혜택 준비중</button>
              )}
            </div>

            {!hasDiscount && (
              <div className="product-modal-coupon-hint">
                아직 이 지역에서 사용할 수 있는 쿠폰이 없어요.<br/>
                여행 기록 승인과 방문 혜택 조건을 채우면 쿠폰을 사용할 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LocalMarket() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [onlyCoupon, setOnlyCoupon] = useState(false);

  const [allVendors, setAllVendors] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [visitCounts, setVisitCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  /* ---------- 🔔 전구(방문 혜택) 상태/위치 ---------- */
  const [showBenefit, setShowBenefit] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const helpBtnRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const openBenefit = () => {
    if (helpBtnRef.current) {
      const r = helpBtnRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom + 10, left: r.right - 320 });
    }
    setShowBenefit(true);
  };
  const closeBenefit = () => setShowBenefit(false);
  const toggleBenefit = () => (showBenefit ? closeBenefit() : openBenefit());
  /* ----------------------------------------------- */

  // ✅ LocalMarket.js — loadData 교체본
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // coupons / stamp 가 실패해도 vendors 는 반드시 살리자!
      const [vendorsRes, couponsRes, visitsRes] = await Promise.allSettled([
        api.get('/api/market/vendors'),
        api.get('/api/coupons/me'),
        api.get('/api/stamp/visitCount'),
      ]);

      // 벤더: 실패해도 최소한 빈배열로
      const vendors =
        vendorsRes.status === 'fulfilled'
          ? (vendorsRes.value?.data?.list || [])
          : [];

      // 쿠폰: 배열/객체 모두 대응, 실패 시 빈배열
      const couponData =
        couponsRes.status === 'fulfilled'
          ? (Array.isArray(couponsRes.value?.data)
              ? couponsRes.value.data
              : (couponsRes.value?.data?.coupons || []))
          : [];

      // 방문수: 실패 시 빈객체
      const visits =
        visitsRes.status === 'fulfilled'
          ? (visitsRes.value?.data || {})
          : {};

      setAllVendors(vendors);
      setCoupons(couponData);
      setVisitCounts(visits);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
      // ❗ 여기서 더 이상 allVendors를 빈배열로 리셋하지 말자
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ loadData(); },[loadData]);

  const allProducts = useMemo(()=>{
    const arr=[];
    allVendors.forEach(v=>{
      if(Array.isArray(v.products)){
        v.products.forEach(p=>arr.push({...p, vendorId:v._id, vendor:v}));
      }
    });
    return arr;
  },[allVendors]);

  // 🎟️ 쿠폰 계산 헬퍼
  const { activeCouponFor, discountPercentFor } = useCouponHelpers(coupons);

  const handleRedeemCoupon = useCallback(async () => {
    if (!selectedVendor) return;
    const coupon = activeCouponFor(selectedVendor.region);
    if (!coupon?._id) return;
    if (!window.confirm(`${selectedVendor.region} ${coupon.discount}% 쿠폰을 사용 처리할까요?`)) return;

    setRedeeming(true);
    try {
      await api.post(`/api/coupons/${coupon._id}/redeem`);
      await loadData();
      setSelectedProduct(null);
      setSelectedVendor(null);
      alert('쿠폰이 사용 처리되었습니다.');
    } catch (e) {
      alert(e?.response?.data?.message || '쿠폰 사용 처리에 실패했습니다.');
    } finally {
      setRedeeming(false);
    }
  }, [activeCouponFor, loadData, selectedVendor]);

  const filteredProducts = useMemo(()=>{
    let r=[...allProducts];
    if (searchTerm.trim()){
      const term = searchTerm.trim().toLowerCase();
      const isCho = /^[ㄱ-ㅎ]+$/.test(searchTerm.trim());
      r = r.filter(p=>{
        const normal = p.name.toLowerCase().includes(term)
          || p.vendor.name.toLowerCase().includes(term)
          || p.vendor.region.toLowerCase().includes(term)
          || p.tags?.some(t=>t.toLowerCase().includes(term));
        const cho = isCho && (matchesChosung(p.name, searchTerm.trim())
          || matchesChosung(p.vendor.name, searchTerm.trim())
          || matchesChosung(p.vendor.region, searchTerm.trim()));
        return normal || cho;
      });
    }
    if (onlyCoupon){
      const regions = coupons.filter(c=>c.status==='active').map(c=>c.region);
      r = r.filter(p=> regions.includes(p.vendor.region));
    }
    if (selectedRegion !== 'all') r = r.filter(p=> p.vendor.region===selectedRegion);

    if (sortBy==='latest') r.sort((a,b)=> new Date(b.vendor.createdAt||0) - new Date(a.vendor.createdAt||0));
    else if (sortBy==='popular') r.sort((a,b)=> (b.vendor.rating||0) - (a.vendor.rating||0));
    else if (sortBy==='price-low') r.sort((a,b)=> (a.price||0) - (b.price||0));
    else if (sortBy==='price-high') r.sort((a,b)=> (b.price||0) - (a.price||0));
    else if (sortBy==='discount'){
      // 할인율 높은순 정렬(동률이면 가격 높은순 보조)
      r.sort((a,b)=>{
        const db = discountPercentFor(b.vendor.region);
        const da = discountPercentFor(a.vendor.region);
        if (db === da) return (b.price||0) - (a.price||0);
        return db - da;
      });
    }
    return r;
  },[allProducts, searchTerm, onlyCoupon, selectedRegion, sortBy, coupons, discountPercentFor]);

  return (
    <div className="local-market-wrapper">
      <div className="market-banner-v2">
        <div className="banner-content">
          <h1 className="banner-title">🎫 지역 혜택 보관함</h1>
          <p className="banner-subtitle">여행 기록으로 열린 지역 쿠폰과 제휴 혜택을 확인하세요</p>
          <div className="banner-stats">
            <span>🏪 제휴처 예시 {allVendors.length}곳</span>
            <span>📦 혜택 항목 {allProducts.length}개</span>
            <span>🎫 보유 쿠폰 {coupons.filter(c=>c.status==='active').length}장</span>
          </div>
          {/* 🔔 배너 하단 안내 문구(기존 스타일과 어울림) */}
          <div className="banner-inline-hint"></div>
        </div>

        {/* 🔔 전구 버튼 + 쿠폰함 버튼 묶음 */}
        <div className="banner-tools">
          <button
            ref={helpBtnRef}
            type="button"
            className="banner-help-btn"
            onClick={toggleBenefit}
            aria-expanded={showBenefit}
            title="방문 혜택 안내"
          >
            💡
          </button>

          <button className="banner-coupon-btn" onClick={()=>navigate('/mypage/main')}>🎫 내 쿠폰함</button>
        </div>
      </div>

      <div className="market-controls-v2">
        <div className="search-box-v2">
          <input
            type="text"
            placeholder="🔍 혜택명, 제휴처, 지역 검색 (초성 가능: ㅂㅅ → 부산)"
            value={searchTerm}
            onChange={(e)=>setSearchTerm(e.target.value)}
            className="search-input-v2"
          />
        </div>

        <div className="filter-bar">
          <select value={selectedRegion} onChange={(e)=>setSelectedRegion(e.target.value)} className="filter-select">
            <option value="all">📍 전체 지역</option>
            {REGIONS.map(r=>(<option key={r} value={r}>{r}</option>))}
          </select>

          <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="filter-select">
            {SORT_OPTIONS.map(opt=>(<option key={opt.key} value={opt.key}>{opt.label}</option>))}
          </select>

          <label className="filter-checkbox">
            <input type="checkbox" checked={onlyCoupon} onChange={(e)=>setOnlyCoupon(e.target.checked)} />
            <span>🎫 쿠폰 보유 지역만</span>
          </label>

          <div className="filter-result-count">총 {filteredProducts.length}개</div>
        </div>
      </div>

      {loading ? (
        <div className="market-loading"><div className="loading-spinner-v2">불러오는 중...</div></div>
      ) : filteredProducts.length === 0 ? (
        <div className="market-empty-v2">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">검색 결과가 없어요</div>
          <div className="empty-hint">다른 키워드로 시도해보세요!</div>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product, idx)=>{
            const pct = discountPercentFor(product.vendor.region);
            return (
              <ProductCard
                key={`${product.vendorId}-${product.name}-${idx}`}
                product={product}
                vendor={product.vendor}
                discountPercent={pct}
                visitCount={visitCounts[product.vendor.region] || 0}
                onClick={(p,v)=>{ setSelectedProduct(p); setSelectedVendor(v); }}
              />
            );
          })}
        </div>
      )}

      {selectedProduct && selectedVendor && (
        <ProductDetailModal
          product={selectedProduct}
          vendor={selectedVendor}
          discountPercent={discountPercentFor(selectedVendor.region)}
          activeCoupon={activeCouponFor(selectedVendor.region)}
          redeeming={redeeming}
          onRedeem={handleRedeemCoupon}
          onClose={()=>{ setSelectedProduct(null); setSelectedVendor(null); }}
        />
      )}

      {/* 🔔 포털 팝오버 렌더 (배너 밖으로 그려져서 절대 안 잘림) */}
      {showBenefit && <BannerBenefitPopover anchor={anchor} onClose={closeBenefit} />}
    </div>
  );
}
