import { useState, useRef, useCallback } from 'react';
import MapView from './components/MapView';
import Joystick from './components/Joystick';
import AddressSearch from './components/AddressSearch';
import SpotSelector from './components/SpotSelector';
import { ACCIDENT_SPOTS } from './data/accidentData.js';

// 新宿区の主要スポット (スタート: 戸塚警察署前)
export const SPOTS = [
  { id: 'totsuka',    name: '警視庁戸塚警察署',     center: [139.7106, 35.7133], bearing: 90  },
  { id: 'takadanobaba', name: '高田馬場駅前交番',   center: [139.7043, 35.7129], bearing: 0   },
  { id: 'totsuka1',   name: '戸塚一丁目交番',       center: [139.7189, 35.7120], bearing: 0   },
  { id: 'shimo-mae',  name: '下落合駅前交番',       center: [139.6945, 35.7170], bearing: 0   },
  { id: 'naka',       name: '中落合交番',           center: [139.6852, 35.7205], bearing: 0   },
  { id: 'nishi',      name: '西落合交番',           center: [139.6795, 35.7231], bearing: 0   },
  { id: 'shimo3',     name: '下落合三丁目駐在所',   center: [139.7043, 35.7203], bearing: 0   },
];

// GSI muniCd (5桁) → 市区町村名
function muniName(code) {
  const pref = { '13':'東京都','14':'神奈川県','11':'埼玉県','12':'千葉県' };
  const ward = {
    '13101':'千代田区','13102':'中央区','13103':'港区','13104':'新宿区',
    '13105':'文京区','13106':'台東区','13107':'墨田区','13108':'江東区',
    '13109':'品川区','13110':'目黒区','13111':'大田区','13112':'世田谷区',
    '13113':'渋谷区','13114':'中野区','13115':'杉並区','13116':'豊島区',
    '13117':'北区','13118':'荒川区','13119':'板橋区','13120':'練馬区',
    '13121':'足立区','13122':'葛飾区','13123':'江戸川区',
  };
  return (ward[code] ?? pref[code?.slice(0,2)] ?? '') + ' ';
}

export default function App() {
  const mapRef       = useRef(null); // MapLibre インスタンス
  const charControls = useRef(null); // { setWalking, jump }
  const joystickRef  = useRef({ x: 0, y: 0 }); // ジョイスティック現在値

  const [showSpots, setShowSpots] = useState(false);
  const [showAccidents, setShowAccidents] = useState(false);
  const [accidentInfo, setAccidentInfo] = useState(null);
  const [activeSpot, setActiveSpot] = useState(SPOTS[0]);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [locating, setLocating] = useState(false);

  // ジョイスティック状態を共有参照に書き込む (再レンダリング不要)
  const handleJoystickMove = useCallback(({ x, y }) => {
    joystickRef.current = { x, y };
    if (charControls.current) {
      charControls.current.setWalking(Math.abs(y) > 0.1);
    }
  }, []);

  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleCharacterReady = useCallback((controls) => {
    charControls.current = controls;
  }, []);

  const flyTo = useCallback((spot) => {
    const map = mapRef.current;
    if (!map) return;
    setActiveSpot(spot);
    setShowSpots(false);
    map.flyTo({
      center:  spot.center,
      bearing: spot.bearing,
      pitch:   70,
      zoom:    18,
      duration: 2000,
    });
  }, []);

  // GSI ジオコーディング API で住所 → 座標変換
  const handleAddressSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setLoadingAddr(true);
    try {
      const res  = await fetch(
        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (data.length > 0) {
        const [lng, lat] = data[0].geometry.coordinates;
        const spot = { id: 'search', name: query, center: [lng, lat], bearing: 0 };
        flyTo(spot);
      } else {
        alert('住所が見つかりませんでした');
      }
    } catch {
      alert('住所検索に失敗しました');
    } finally {
      setLoadingAddr(false);
    }
  }, [flyTo]);

  const handleJump = useCallback(() => {
    charControls.current?.jump();
  }, []);

  const handleZoomIn  = useCallback(() => { mapRef.current?.zoomIn();  }, []);
  const handleZoomOut = useCallback(() => { mapRef.current?.zoomOut(); }, []);

  const handleLocate = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    setLocating(true);
    setCurrentAddress(null);
    const { lng, lat } = map.getCenter();
    try {
      const res  = await fetch(
        `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const r    = data.results;
      setCurrentAddress(r
        ? `${muniName(r.muniCd)}${r.lv01Nm ?? ''}${r.lv02Nm ? r.lv02Nm + '番' : ''}${r.lv03Nm ? r.lv03Nm + '号' : ''}`
        : '住所不明');
    } catch {
      setCurrentAddress('住所取得失敗');
    }
    setLocating(false);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* メインマップ */}
      <MapView
        initialSpot={SPOTS[0]}
        joystickRef={joystickRef}
        onMapReady={handleMapReady}
        onCharacterReady={handleCharacterReady}
        onAccidentClick={setAccidentInfo}
      />

      {/* 上部: タイトルバー */}
      <div style={styles.topBar}>
        <span style={styles.title}>戸塚3D探索</span>
        <button style={styles.spotBtn} onClick={() => { setShowSpots(v => !v); setShowAccidents(false); }}>
          📍 {activeSpot.name}
        </button>
      </div>

      {/* スポットセレクター */}
      {showSpots && (
        <SpotSelector
          spots={SPOTS}
          active={activeSpot}
          onSelect={flyTo}
          onClose={() => setShowSpots(false)}
        />
      )}

      {/* 死亡事故発生ボタン (左上) */}
      <button style={styles.accidentBtn} onClick={() => { setShowAccidents(v => !v); setShowSpots(false); }}>
        ⚠️ 死亡事故発生
      </button>

      {/* 死亡事故スポット一覧 */}
      {showAccidents && (
        <div style={styles.accidentList}>
          <div style={styles.accidentListHeader}>
            <span>死亡事故発生一覧 ({ACCIDENT_SPOTS.length}件)</span>
            <button style={styles.accidentListClose} onClick={() => setShowAccidents(false)}>✕</button>
          </div>
          {ACCIDENT_SPOTS.map((s) => (
            <button key={s.id} style={styles.accidentListItem} onClick={() => {
              mapRef.current?.flyTo({ center: s.center, zoom: 18, pitch: 70, duration: 1500 });
              setShowAccidents(false);
            }}>
              <span style={{ fontSize: 12, color: 'rgba(255,200,200,0.9)' }}>{s.date}</span>
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>{s.location}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,200,200,0.8)' }}>{s.type}</span>
            </button>
          ))}
        </div>
      )}

      {/* 現在位置ボタン＋住所表示 (右上) */}
      <div style={styles.locateBox}>
        <button style={styles.locateBtn} onClick={handleLocate} disabled={locating}>
          {locating ? '取得中…' : '📍 現在地確認'}
        </button>
        {currentAddress && (
          <span style={styles.locateAddr}>{currentAddress}</span>
        )}
      </div>

      {/* 住所検索 */}
      <AddressSearch onSearch={handleAddressSearch} loading={loadingAddr} />

      {/* ズームボタン (右下、ジャンプの上) */}
      <div style={styles.zoomGroup}>
        <button style={styles.zoomBtn} onPointerDown={handleZoomIn}>＋</button>
        <button style={styles.zoomBtn} onPointerDown={handleZoomOut}>－</button>
      </div>

      {/* ジャンプボタン (右下) */}
      <button style={styles.jumpBtn} onPointerDown={handleJump}>
        ↑<br /><span style={{ fontSize: 10 }}>ジャンプ</span>
      </button>

      {/* バーチャルジョイスティック (左下) */}
      <div style={styles.joystickWrapper}>
        <Joystick onMove={handleJoystickMove} />
      </div>

      {/* 事故情報カード */}
      {accidentInfo && (
        <div style={styles.accidentCard}>
          <div style={styles.accidentCardInner}>
            <div style={styles.accidentCardTitle}>{accidentInfo.date} {accidentInfo.location}</div>
            <div style={styles.accidentCardType}>{accidentInfo.type}</div>
            {accidentInfo.parties.map((p, i) => (
              <div key={i} style={styles.accidentCardParty}>{p}</div>
            ))}
          </div>
          <button style={styles.infoClose} onClick={() => setAccidentInfo(null)}>✕</button>
        </div>
      )}

      {/* PC 向け操作説明 */}
      <div style={styles.hint}>
        PC: WASD移動 / マウスドラッグ視点変更
      </div>
    </div>
  );
}

const styles = {
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
    color: '#fff',
    zIndex: 20,
    pointerEvents: 'none',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: '0.05em',
  },
  spotBtn: {
    pointerEvents: 'auto',
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 20,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  joystickWrapper: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    zIndex: 20,
  },
  jumpBtn: {
    position: 'absolute',
    bottom: 64,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.2,
  },
  locateBox: {
    position: 'absolute',
    top: 94,
    right: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    zIndex: 20,
  },
  locateBtn: {
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: 16,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  locateAddr: {
    padding: '4px 8px',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  zoomGroup: {
    position: 'absolute',
    bottom: 148,
    right: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    zIndex: 20,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255,255,255,0.5)',
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  accidentBtn: {
    position: 'absolute',
    top: 44,
    left: 12,
    padding: '6px 12px',
    background: 'rgba(180,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: 20,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    zIndex: 20,
  },
  accidentList: {
    position: 'absolute',
    top: 82,
    left: 12,
    width: 260,
    background: 'rgba(120,0,0,0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,100,100,0.4)',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 25,
  },
  accidentListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    borderBottom: '1px solid rgba(255,100,100,0.3)',
  },
  accidentListClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 4px',
  },
  accidentListItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    width: '100%',
    padding: '10px 12px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(255,100,100,0.2)',
    color: '#fff',
    textAlign: 'left',
    cursor: 'pointer',
  },
  accidentCard: {
    position: 'absolute',
    bottom: 36,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: 'rgba(120,0,0,0.9)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,100,100,0.5)',
    borderRadius: 12,
    padding: '10px 14px',
    zIndex: 30,
    maxWidth: '90vw',
  },
  accidentCardInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  accidentCardTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  accidentCardType: {
    color: 'rgba(255,200,200,0.9)',
    fontSize: 12,
  },
  accidentCardParty: {
    color: 'rgba(255,220,220,0.85)',
    fontSize: 12,
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    pointerEvents: 'none',
    zIndex: 10,
    whiteSpace: 'nowrap',
  },
};
