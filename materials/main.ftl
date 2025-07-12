<!DOCTYPE html>
<html lang="en">
<head>
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
</head>
<body>

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
            <div>Web-Hosting powered by <a href="https://www.maximillian-workflows.com">Maximillian Workflows</a></div>
        </div>
    </footer>
</div>
</body>
</html>
