import { useState, useRef, useCallback } from 'react';
import MapView from './components/MapView';
import Joystick from './components/Joystick';
import AddressSearch from './components/AddressSearch';
import SpotSelector from './components/SpotSelector';

// 新宿区の主要スポット (スタート: 戸塚警察署前)
export const SPOTS = [
  { id: 'totsuka', name: '戸塚警察署前', center: [139.7197, 35.7063], bearing: 180 },
  { id: 'waseda',  name: '早稲田大学',   center: [139.7194, 35.7090], bearing: 0   },
  { id: 'kabuki',  name: '歌舞伎町',     center: [139.7044, 35.6958], bearing: -30 },
  { id: 'station', name: '新宿駅',       center: [139.7004, 35.6896], bearing: 0   },
  { id: 'tochomae',name: '東京都庁',     center: [139.6917, 35.6896], bearing: 30  },
  { id: 'gyoen',   name: '新宿御苑',     center: [139.7103, 35.6860], bearing: 90  },
];

export default function App() {
  const mapRef       = useRef(null); // MapLibre インスタンス
  const charControls = useRef(null); // { setWalking, jump }
  const joystickRef  = useRef({ x: 0, y: 0 }); // ジョイスティック現在値

  const [showSpots, setShowSpots] = useState(false);
  const [activeSpot, setActiveSpot] = useState(SPOTS[0]);
  const [loadingAddr, setLoadingAddr] = useState(false);

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
      zoom:    17.5,
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>

      {/* メインマップ */}
      <MapView
        initialSpot={SPOTS[0]}
        joystickRef={joystickRef}
        onMapReady={handleMapReady}
        onCharacterReady={handleCharacterReady}
      />

      {/* 上部: タイトルバー */}
      <div style={styles.topBar}>
        <span style={styles.title}>新宿3D探索</span>
        <button style={styles.spotBtn} onClick={() => setShowSpots(v => !v)}>
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

      {/* 住所検索 */}
      <AddressSearch onSearch={handleAddressSearch} loading={loadingAddr} />

      {/* ジャンプボタン (右下) */}
      <button style={styles.jumpBtn} onPointerDown={handleJump}>
        ↑<br /><span style={{ fontSize: 10 }}>ジャンプ</span>
      </button>

      {/* バーチャルジョイスティック (左下) */}
      <div style={styles.joystickWrapper}>
        <Joystick onMove={handleJoystickMove} />
      </div>

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
