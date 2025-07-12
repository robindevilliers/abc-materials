<!DOCTYPE html>
<html lang="en">
<head>
    <#if trackingId?? && trackingId?starts_with("GTM-")>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${trackingId}');</script>
    <!-- End Google Tag Manager -->
    </#if>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ABC Accountancy <#if title?? && title?has_content >:</#if> ${title}</title>
    <#if noindex>
        <meta name="robots" content="noindex">
    </#if>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
    <link href="/public/css/main.css" rel="stylesheet">
    <script src="/public/js/main.js"></script>
    <meta name="description" content="MATERIALS_BLURB_TOKEN">
    <link rel="canonical" href="MATERIALS_CANONICAL_URL_TOKEN">
    <meta property="og:url" content="MATERIALS_CANONICAL_URL_TOKEN" />
    <meta property="og:site_name" content="MATERIALS_PAGE_TITLE_TOKEN" />
    <meta property="og:locale" content="MATERIALS_LOCALE_TOKEN" />
    <meta property="og:image" content="MATERIALS_OG_IMAGE_TOKEN" />
    <meta property="og:image:width" content="MATERIALS_OG_IMAGE_WIDTH_TOKEN" />
    <meta property="og:image:height" content="MATERIALS_OG_IMAGE_HEIGHT_TOKEN" />
    <meta property="og:image:alt" content="MATERIALS_PAGE_TITLE_TOKEN" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="apple-touch-icon" sizes="180x180" href="MATERIALS_APPLE_TOUCH_ICON_TOKEN" />
    <meta name="theme-color" content="MATERIALS_THEME_COLOR_TOKEN" />
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "MATERIALS_PAGE_TITLE_TOKEN",
            "description": "MATERIALS_BLURB_TOKEN"
        }
    </script>
    MATERIALS_ICON_LINKS_TOKEN
    <#if trackingId?? && trackingId?starts_with("G-")>
        <!-- Google tag (gtag.js) -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag() {
                dataLayer.push(arguments);
            }
            gtag('js', new Date());
            gtag('config', '${trackingId}');
        </script>
    </#if>
</head>
<body>
<#if trackingId?? &&  trackingId?starts_with("GTM-")>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${trackingId}"
            height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
</#if>
<div class="container">
    <header class="minor-title-panel">
        <div class="brand-outer">
            <div class="brand-inner">
                <div class="image-panel">
                    <img src="/public/img/logo.jpg" alt="title">
                </div>
                <div class="text-primary title-text">ABC Accountancy</div>
            </div>
        </div>

        <div class="page-logout">
            <#if authenticated>
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link text-muted" href="/logout">Logout</a>
                    </li>
                </ul>
            </#if>
        </div>
    </header>
    <main>
        ${body}
    </main>
    <footer class="footer">
        <hr>
        <div class="footer-content">
            <div>© All rights reserved</div>
            <div>Web-Hosting powered by <a <#if testMode>href="javascript:void(0)" onclick="alert('Link clicked');"<#else>href="https://www.maximillian-workflows.com"</#if>>Maximillian Workflows</a></div>
        </div>
    </footer>
</div>
</body>
</html>
