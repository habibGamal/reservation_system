<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="rtl" @class(['dark' => ($appearance ?? 'system') == 'dark'])>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet">

    {{-- Inline script to detect system dark mode preference and apply it immediately --}}
    <script>
        (function () {
            const appearance = '{{ $appearance ?? "system" }}';

            if (appearance === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                if (prefersDark) {
                    document.documentElement.classList.add('dark');
                }
            }
        })();
    </script>

    {{-- Inline style to set the HTML background color based on our theme in app.css --}}
    <style>
        html {
            background-color: oklch(1 0 0);
        }

        html.dark {
            background-color: oklch(0.145 0 0);
        }

        /* Initial Page Loading Screen */
        .app-loading-screen {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: oklch(1 0 0 / 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #053f89;
            transition: opacity 0.3s ease, visibility 0.3s ease;
            user-select: none;
        }

        html.dark .app-loading-screen {
            background-color: oklch(0.145 0 0 / 0.85);
            color: #38bdf8;
        }

        .app-loading-screen.app-loading-hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .app-loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
        }

        .app-loading-logo-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 96px;
            height: 96px;
        }

        .app-loading-glow {
            position: absolute;
            inset: -16px;
            border-radius: 9999px;
            background: radial-gradient(circle, rgba(5, 63, 137, 0.18) 0%, transparent 70%);
            filter: blur(16px);
            pointer-events: none;
        }

        html.dark .app-loading-glow {
            background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
        }

        .app-loading-svg {
            width: 88px;
            height: 88px;
            overflow: visible;
        }

        .app-loading-brand {
            margin-top: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            font-family: 'Cairo', system-ui, sans-serif;
        }

        .brand-title {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.025em;
        }

        html.dark .brand-title {
            color: #f8fafc;
        }

        .brand-subtitle {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            letter-spacing: 0.1em;
        }

        html.dark .brand-subtitle {
            color: #94a3b8;
        }

        .app-loading-bar {
            width: 128px;
            height: 3px;
            background-color: rgba(0, 0, 0, 0.08);
            border-radius: 9999px;
            margin-top: 16px;
            overflow: hidden;
            position: relative;
        }

        html.dark .app-loading-bar {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .app-loading-bar-inner {
            width: 50%;
            height: 100%;
            background: linear-gradient(90deg, transparent, currentColor, transparent);
            border-radius: 9999px;
            position: absolute;
            animation: app-bar-pulse 1.4s ease-in-out infinite;
        }

        @keyframes app-bar-pulse {
            0% {
                left: -50%;
            }
            100% {
                left: 100%;
            }
        }

        @keyframes eagle-svg-fill {
            0% {
                fill: transparent;
                opacity: 0.15;
            }
            100% {
                fill: currentColor;
                opacity: 1;
            }
        }

        .svg-elem-loop .svg-elem-1 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.15s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-2 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.25s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-3 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.35s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-4 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.45s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-5 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.55s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-6 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.65s infinite alternate both;
        }
        .svg-elem-loop .svg-elem-7 {
            animation: eagle-svg-fill 0.85s cubic-bezier(0.47, 0, 0.745, 0.715) 0.75s infinite alternate both;
        }
    </style>

    <link rel="icon" href="/favicon.ico?v=2" sizes="any">
    <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0284c7">

    @fonts

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    <x-inertia::head>
        <title>{{ config('app.name', 'Laravel') }}</title>
    </x-inertia::head>
</head>

<body class="font-sans antialiased">
    {{-- Initial & Route-Change Fullscreen Loading Overlay --}}
    <div id="app-loading-screen" class="app-loading-screen" role="status" aria-label="جاري التحميل...">
        <div class="app-loading-content">
            <div class="app-loading-logo-wrap">
                <div class="app-loading-glow"></div>
                <svg id="app-loading-svg" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500.000000 500.000000" preserveAspectRatio="xMidYMid meet" class="app-loading-svg svg-elem-loop">
                    <g transform="translate(0.000000,500.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                        <path d="M794 3310 c5 -188 17 -256 75 -425 109 -313 377 -606 823 -898 65 -43 148 -103 185 -135 38 -32 79 -67 91 -78 13 -10 52 -53 86 -94 171 -205 239 -350 360 -765 l34 -120 1 110 c1 61 -6 166 -14 235 -55 469 -247 747 -743 1078 -243 162 -388 293 -530 480 -153 201 -256 406 -339 677 l-34 110 5 -175z" class="svg-elem-1"></path>
                        <path d="M4150 3428 c-112 -426 -359 -816 -678 -1070 -42 -33 -132 -97 -201 -143 -422 -277 -633 -550 -712 -920 -23 -110 -41 -312 -37 -420 l3 -80 43 153 c155 552 307 773 722 1049 197 132 309 221 444 358 230 230 347 435 411 720 16 69 34 395 22 395 -4 0 -11 -19 -17 -42z" class="svg-elem-2"></path>
                        <path d="M2424 2431 c-23 -14 -39 -38 -62 -95 -17 -42 -57 -119 -88 -172 -54 -90 -56 -98 -43 -120 30 -50 259 -354 267 -354 4 0 65 81 135 180 l129 180 -92 106 c-112 130 -123 150 -93 174 12 9 40 20 63 24 35 5 41 10 38 28 -2 18 -17 27 -78 45 -91 28 -135 29 -176 4z" class="svg-elem-3"></path>
                        <path d="M910 2374 c0 -37 91 -203 155 -282 118 -146 334 -322 530 -434 170 -96 269 -203 462 -494 44 -65 104 -161 134 -212 51 -87 54 -91 57 -61 9 86 -79 339 -172 497 -67 113 -110 169 -194 256 -82 84 -125 114 -272 191 -229 121 -424 268 -602 454 -57 59 -98 95 -98 85z" class="svg-elem-4"></path>
                        <path d="M3905 2244 c-186 -186 -371 -321 -603 -438 -134 -67 -238 -164 -349 -323 -122 -176 -215 -407 -237 -588 l-6 -50 32 50 c17 28 49 79 71 115 149 243 312 466 390 535 28 25 103 76 166 112 258 150 516 386 617 563 25 44 69 159 63 163 -2 1 -67 -61 -144 -139z" class="svg-elem-5"></path>
                        <path d="M1104 1760 c15 -52 78 -171 122 -229 77 -103 167 -177 287 -237 139 -69 196 -114 390 -303 87 -84 160 -151 164 -147 9 9 -26 83 -71 151 -50 75 -221 246 -305 305 -192 136 -311 231 -521 420 -59 52 -71 60 -66 40z" class="svg-elem-6"></path>
                        <path d="M3790 1718 c-106 -97 -339 -291 -420 -348 -246 -175 -406 -345 -462 -494 l-20 -51 29 25 c15 14 84 81 153 150 152 152 264 238 390 298 83 40 107 58 190 141 52 53 110 122 129 153 33 58 85 177 79 183 -2 2 -32 -24 -68 -57z" class="svg-elem-7"></path>
                    </g>
                </svg>
            </div>
            <div class="app-loading-brand">
                <span class="brand-title">منتجع النسور</span>
                <span class="brand-subtitle">EAGLES RESORT</span>
            </div>
            <div class="app-loading-bar">
                <div class="app-loading-bar-inner"></div>
            </div>
        </div>
    </div>

    <x-inertia::app />
</body>

</html>