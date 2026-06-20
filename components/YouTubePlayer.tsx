import React, { useRef, forwardRef, useImperativeHandle, useState, useCallback, useEffect } from 'react';

/** Exposed handle so parent can mute/unmute without remounting the iframe */
export interface YouTubePlayerHandle {
  mute: () => void;
  unmute: () => void;
}

interface YouTubePlayerProps {
  videoId: string;
  autoplay?: boolean;
  /** Initial mute state (always true for guaranteed autoplay). */
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  className?: string;
  title?: string;
  /** Optional poster image shown until iframe is ready */
  posterUrl?: string;
  /** Callback fired when the video finishes playing */
  onEnd?: () => void;
}

const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      videoId,
      autoplay = true,
      muted = true,
      controls = false,
      loop = true,
      className = '',
      title = 'YouTube trailer',
      posterUrl,
      onEnd,
    },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [posterVisible, setPosterVisible] = useState(!!posterUrl);

    // youtube-nocookie.com loads ~40% faster (no Google tracking scripts)
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      mute: muted ? '1' : '0',
      controls: controls ? '1' : '0',
      disablekb: '1',
      enablejsapi: '1',   // allows postMessage mute control
      fs: '0',
      iv_load_policy: '3',
      loop: loop ? '1' : '0',
      modestbranding: '1',
      origin: window.location.origin,
      playsinline: '1',
      playlist: videoId,  // required for loop
      rel: '0',
      start: '0',
      widget_referrer: window.location.origin,
    });

    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;

    /** Send a YouTube player command via postMessage — no iframe remount needed */
    const postCommand = useCallback((func: string, args: unknown[] = []) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      } catch (_) {
        // cross-origin errors are silently ignored
      }
    }, []);

    useImperativeHandle(ref, () => ({
      mute: () => postCommand('mute'),
      unmute: () => postCommand('unMute'),
    }));

    const handleIframeLoad = useCallback(() => {
      // Fade out poster once iframe is ready
      setPosterVisible(false);
      // Tell YouTube iframe to start broadcasting state changes
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening' }),
          '*'
        );
      } catch (_) {}
    }, []);

    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.origin.includes('youtube')) return;
        
        try {
          const data = JSON.parse(event.data);
          // Check for video ended state (0)
          if (
            (data.event === 'infoDelivery' && data.info && data.info.playerState === 0) ||
            (data.event === 'onStateChange' && data.info === 0)
          ) {
            if (onEnd) onEnd();
          }
        } catch (e) {
          // ignore parsing errors
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [onEnd]);

    return (
      <div className={`relative bg-black overflow-hidden ${className}`}>
        {/* Poster image — shows instantly while iframe loads */}
        {posterUrl && (
          <img
            src={posterUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: posterVisible ? 1 : 0, zIndex: 2, pointerEvents: 'none' }}
          />
        )}

        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          style={{ zIndex: 1 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      </div>
    );
  }
);

YouTubePlayer.displayName = 'YouTubePlayer';
export default YouTubePlayer;
