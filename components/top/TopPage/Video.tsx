import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from '@/i18n/client';

// YouTube Player types
interface YouTubePlayer {
  playVideo: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

interface YouTubePlayerErrorEvent {
  data: number;
}

interface YouTubePlayerStateChangeEvent {
  target: YouTubePlayer;
  data: number;
}

interface VideoData {
  id: string;
  videoId: string;
  title: string;
  description: string;
  link?: {
    url: string;
    text: string;
  };
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: HTMLElement | string, config: {
        videoId: string;
        playerVars: Record<string, number | string>;
        events: {
          onReady: (event: YouTubePlayerEvent) => void;
          onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
          onError: (event: YouTubePlayerErrorEvent) => void;
        };
      }) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const Video = ({ lng }: { lng: string }) => {
  const { t } = useTranslation(lng, 'common');

  // 動画データ（実際のプロジェクトではAPIや外部データから取得）
  const getVideoLink = useCallback((videoNumber: string): VideoData['link'] | undefined => {
    try {
      const linkData = t(`top.video.videos.${videoNumber}.link`, { returnObjects: true });
      
      if (linkData && typeof linkData === 'object' && 'url' in linkData && 'text' in linkData) {
        return linkData as VideoData['link'];
      }
      return undefined;
    } catch (error) {
      console.error(`Error getting link for video ${videoNumber}:`, error);
      return undefined;
    }
  }, [t]);

  const videoData = useMemo<VideoData[]>(() => [
    {
      id: '1',
      videoId: 'uGNrqazYs58',
      title: t('top.video.videos.1.title'),
      description: t('top.video.videos.1.description'),
      link: getVideoLink('1')
    },
    {
      id: '2',
      videoId: 'XLk3RuRt1fA',
      title: t('top.video.videos.2.title'),
      description: t('top.video.videos.2.description'),
      link: getVideoLink('2')
    }
  ], [t, getVideoLink]);

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isAudioHintVisible, setIsAudioHintVisible] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isUnmuted, setIsUnmuted] = useState(false); // ユーザーがunmuteしたかを追跡
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const currentVideoIdRef = useRef<string>('');
  const lastVideoIndexRef = useRef<number>(-1);

  const currentVideo = videoData[currentVideoIndex];

  // 動画終了時の自動進行ハンドラー
  const handleVideoEnd = useCallback(() => {
    const nextIndex = (currentVideoIndex + 1) % videoData.length;
    setCurrentVideoIndex(nextIndex);
  }, [currentVideoIndex, videoData.length]);

  // YouTube プレイヤーの状態変更ハンドラー
  const handlePlayerStateChange = useCallback((event: YouTubePlayerStateChangeEvent) => {
    // 状態 0 = 動画終了
    if (event.data === 0) {
      handleVideoEnd();
    }
  }, [handleVideoEnd]);

  // 動画変更時のプレイヤー初期化関数
  const initializePlayerForVideoChange = useCallback(() => {
    const videoToLoad = videoData[currentVideoIndex];
    
    if (!containerRef.current || !window.YT || !window.YT.Player || !isAPIReady || !videoToLoad || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setIsPlayerReady(false);

    try {
      // 既存のプレイヤーがあれば破棄
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (destroyError) {
          console.warn('Error destroying previous player:', destroyError);
        }
      }

      // コンテナをクリア
      const container = containerRef.current;
      container.innerHTML = '';

      // 新しいプレイヤー用のdivを作成
      const playerDiv = document.createElement('div');
      playerDiv.id = `youtube-player-${videoToLoad.id}`;
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      container.appendChild(playerDiv);

      currentVideoIdRef.current = videoToLoad.videoId;

      playerRef.current = new window.YT.Player(playerDiv, {
        videoId: videoToLoad.videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: YouTubePlayerEvent) => {
            setIsPlayerReady(true);
            setIsInitializing(false);
            setIsAudioHintVisible(!isUnmuted); // unmuteされている場合はヒントを非表示
            // プレイヤーが準備できたら再生開始
            if (event.target && typeof event.target.playVideo === 'function') {
              try {
                event.target.playVideo();
                // 以前にunmuteされていた場合は自動的にunmute
                if (isUnmuted && typeof event.target.unMute === 'function') {
                  event.target.unMute();
                } else if (isUnmuted && typeof event.target.setVolume === 'function') {
                  event.target.setVolume(50);
                }
              } catch (playError) {
                console.warn('Error starting video playback:', playError);
              }
            }
          },
          onStateChange: handlePlayerStateChange,
          onError: (event: YouTubePlayerErrorEvent) => {
            console.error('YouTube player error:', event.data);
            console.error('Error codes: 2=Invalid video ID, 5=HTML5 player error, 100=Video not found, 101/150=Video not available');
            setIsPlayerReady(false);
            setIsInitializing(false);
            currentVideoIdRef.current = '';
          }
        },
      });
    } catch (error) {
      console.error('Failed to initialize YouTube player for video change:', error);
      setIsPlayerReady(false);
      setIsInitializing(false);
      currentVideoIdRef.current = '';
    }
  }, [currentVideoIndex, isAPIReady, isInitializing, isUnmuted, handlePlayerStateChange, videoData]);

  // YouTube IFrame API 読み込み
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        setIsAPIReady(true);
        return;
      }

      // スクリプトが既に存在するかチェック
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        // すでにスクリプトがある場合は、APIの準備を待つ
        let apiLoadedFlag = false; // API読み込み完了フラグ
        
        const checkAPI = setInterval(() => {
          if (window.YT && window.YT.Player) {
            apiLoadedFlag = true; // フラグを設定
            setIsAPIReady(true);
            clearInterval(checkAPI);
            clearTimeout(timeoutId); // タイムアウトもクリア
          }
        }, 100);
        
        // 10秒後にタイムアウト（フラグをチェック）
        const timeoutId = setTimeout(() => {
          clearInterval(checkAPI);
          if (!apiLoadedFlag) {
            console.warn('YouTube API load timeout - API may still be loading in background');
          }
        }, 10000);
        
        return;
      }

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      tag.onerror = () => {
        console.error('Failed to load YouTube API script');
      };

      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // グローバルコールバック設定
      window.onYouTubeIframeAPIReady = () => {
        setIsAPIReady(true);
      };
    };

    loadYouTubeAPI();

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.warn('Error destroying player in cleanup:', error);
        }
      }
    };
  }, []);

  // 動画変更時にプレイヤーを再初期化
  useEffect(() => {
    // 実際に動画インデックスが変わった場合のみ実行
    if (lastVideoIndexRef.current !== -1 && lastVideoIndexRef.current !== currentVideoIndex && hasPlayedOnce && isAPIReady && !isInitializing) {
      currentVideoIdRef.current = ''; // 強制的にリセットして再初期化を許可
      initializePlayerForVideoChange(); // 動画変更用の初期化
    }
    lastVideoIndexRef.current = currentVideoIndex;
  }, [currentVideoIndex, hasPlayedOnce, isAPIReady, isInitializing, initializePlayerForVideoChange]);

  // Intersection Observer で画面に入ったかを監視
  useEffect(() => {
    const currentVideoWrapper = videoWrapperRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        // 初回の画面表示時のみプレイヤーを初期化
        if (entry.isIntersecting && !hasPlayedOnce && isAPIReady && !isInitializing) {
          setHasPlayedOnce(true);
          // 初回のみ直接実行
          const initPlayer = () => {
            const videoToLoad = videoData[currentVideoIndex];
            
            if (!containerRef.current || !window.YT || !window.YT.Player || !isAPIReady || !videoToLoad) {
              return;
            }

            setIsInitializing(true);
            setIsPlayerReady(false);

            try {
              const container = containerRef.current;
              container.innerHTML = '';

              const playerDiv = document.createElement('div');
              playerDiv.id = `youtube-player-${videoToLoad.id}`;
              playerDiv.style.width = '100%';
              playerDiv.style.height = '100%';
              container.appendChild(playerDiv);

              currentVideoIdRef.current = videoToLoad.videoId;

              playerRef.current = new window.YT.Player(playerDiv, {
                videoId: videoToLoad.videoId,
                playerVars: {
                  autoplay: 1,
                  mute: 1,
                  controls: 1,
                  rel: 0,
                  modestbranding: 1,
                  enablejsapi: 1,
                  origin: window.location.origin,
                },
                events: {
                  onReady: (event: YouTubePlayerEvent) => {
                    setIsPlayerReady(true);
                    setIsInitializing(false);
                    setIsAudioHintVisible(!isUnmuted); // unmuteされている場合はヒントを非表示
                    if (event.target && typeof event.target.playVideo === 'function') {
                      try {
                        event.target.playVideo();
                        // 以前にunmuteされていた場合は自動的にunmute
                        if (isUnmuted && typeof event.target.unMute === 'function') {
                          event.target.unMute();
                        } else if (isUnmuted && typeof event.target.setVolume === 'function') {
                          event.target.setVolume(50);
                        }
                      } catch (playError) {
                        console.warn('Error starting video playback:', playError);
                      }
                    }
                  },
                  onStateChange: handlePlayerStateChange,
                  onError: (event: YouTubePlayerErrorEvent) => {
                    console.error('YouTube player error:', event.data);
                    setIsPlayerReady(false);
                    setIsInitializing(false);
                    currentVideoIdRef.current = '';
                  }
                },
              });
            } catch (error) {
              console.error('Failed to initialize YouTube player:', error);
              setIsPlayerReady(false);
              setIsInitializing(false);
              currentVideoIdRef.current = '';
            }
          };
          
          initPlayer();
        }
      },
      {
        threshold: 0.3, // 30%が見えた時に発動
        rootMargin: '50px 0px' // 50px余裕を持たせる
      }
    );

    if (currentVideoWrapper) {
      observer.observe(currentVideoWrapper);
    }

    return () => {
      if (currentVideoWrapper) {
        observer.unobserve(currentVideoWrapper);
      }
    };
  }, [hasPlayedOnce, isAPIReady, isInitializing, currentVideoIndex, isUnmuted, handlePlayerStateChange, videoData]);

  const handleUnmute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    try {
      if (playerRef.current && isPlayerReady) {
        // プレイヤーのメソッドが存在するかチェック
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
          setIsAudioHintVisible(false);
          setIsUnmuted(true); // ユーザーがunmuteしたことを記録
        } else if (typeof playerRef.current.setVolume === 'function') {
          // fallback: ボリュームを設定してミュートを解除
          playerRef.current.setVolume(50);
          setIsAudioHintVisible(false);
          setIsUnmuted(true); // ユーザーがunmuteしたことを記録
        } else {
          console.warn('Unmute methods not available on player');
        }
      } else {
        console.warn('Player not ready or not available');
      }
    } catch (error) {
      console.error('Failed to unmute video:', error);
      // エラーが発生してもヒントは非表示にし、unmuted状態を設定
      setIsAudioHintVisible(false);
      setIsUnmuted(true);
    }
  };

  const handleVideoContainerClick = (e: React.MouseEvent) => {
    // クリックがオーバーレイでない場合のみ音声ヒントを非表示にする
    if (isAudioHintVisible && !(e.target as HTMLElement).closest('.audio-hint-overlay')) {
      setIsAudioHintVisible(false);
    }
  };

  const handleDotClick = (index: number) => {
    if (index !== currentVideoIndex && !isInitializing) {
      setCurrentVideoIndex(index);
      setIsAudioHintVisible(true);
    }
  };

      return (
      <div className="bg-[#F5F5F5] pt-[88px] pb-[88px]">
        <div className="max-w-[1440px] mx-auto px-4">
        {/* メインコンテンツ - 左右分割レイアウト */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[88px] items-start">
          {/* 左側 - 説明エリア */}
          <div className="flex-1 lg:max-w-[500px] flex flex-col" style={{ height: '541px' }}>
            {/* 上部 - タイトル */}
            <h3 className="text-dark-blue text-[32px] font-medium mb-6">
              {currentVideo.title}
            </h3>
            
            {/* ドットナビゲーション */}
            <div className="flex items-center gap-2 mb-8">
              {videoData.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={`rounded-full transition-all duration-300 hover:scale-110 cursor-pointer ${
                    index === currentVideoIndex
                      ? 'w-11 h-2 bg-dark-blue'
                      : 'w-6 h-2 bg-dark-blue opacity-30 hover:opacity-50'
                  }`}
                  aria-label={`Video ${index + 1}`}
                />
              ))}
            </div>
            
            {/* 説明文 */}
            <div className="text-dark-blue text-[18px] leading-relaxed whitespace-pre-line">
              {currentVideo.description}
            </div>
          </div>
          
          {/* 右側 - 動画エリア */}
          <div className="flex-shrink-0 w-full lg:w-auto">
            <div ref={videoWrapperRef} className="relative" onClick={handleVideoContainerClick}>
              {/* 動画コンテナー - 962px幅、アスペクト比維持 */}
              <div 
                className="relative bg-gray-900 rounded-lg overflow-hidden"
                style={{ 
                  height: '541px',
                  width: '962px', // 16:9のアスペクト比
                  maxWidth: '100%'
                }}
              >
                {/* プレースホルダー背景画像 */}
                {!hasPlayedOnce && (
                  <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center flex items-center justify-center bg-gray-800"
                    style={{
                      backgroundImage: `url('https://i.ytimg.com/vi/${currentVideo.videoId}/maxresdefault.jpg')`,
                    }}
                  >
                    <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors cursor-pointer">
                      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                )}
                
                {/* ローディングインジケータ */}
                {hasPlayedOnce && (isInitializing || !isPlayerReady) && (
                  <div className="absolute inset-0 w-full h-full bg-gray-900 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <p className="text-white text-sm">
                        {isInitializing ? 'Initializing player...' : 'Loading video...'}
                      </p>
                    </div>
                  </div>
                )}
                
                <div
                  ref={containerRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
              
              {/* 音声ヒントオーバーレイ */}
              {isAudioHintVisible && hasPlayedOnce && (
                <div 
                  className="audio-hint-overlay absolute top-4 right-4 bg-black/70 text-white px-4 py-3 rounded-xl text-sm flex items-center gap-3 cursor-pointer transition-all duration-300 hover:bg-black/90 hover:scale-105 active:scale-95 shadow-lg border border-white/20 backdrop-blur-sm z-10"
                  onClick={handleUnmute}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="flex-shrink-0">
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" 
                      />
                    </svg>
                  </div>
                  <span className="font-medium select-none">
                    {t('top.video.clickToUnmute') || 'クリックして音声をオン'}
                  </span>
                  <div className="flex-shrink-0 opacity-70">
                    <svg 
                      className="w-4 h-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" 
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
