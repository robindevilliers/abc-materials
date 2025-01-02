<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ABC Accountancy: ${title}</title>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css">
    <link href="/public/css/main.css" rel="stylesheet">
    <script src="/public/js/main.js"></script>
</head>
<body>

<div class="container">
    <div class="minor-title-panel">
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
    </div>
    ${body}

</div>

<footer class="footer">
    <hr>
</footer>
</body>
</html>
