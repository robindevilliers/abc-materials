<form action="${action}" class="login-panel-widget login-panel" method="post"
        enctype="application/x-www-form-urlencoded" style="${itemStyles}">
    <input type="hidden" name="_csrf" value="${_csrf}">
    <div class="card">
        <div class="card-header">
            Customer Login
        </div>
        <div class="card-body">
            <div class="row">
                <div class="col mb-3">
                    <label for="loginPanelUsername" class="form-label">Username</label>
                    <div class="input-group">
                        <input type="text" name="username" class="form-control" id="loginPanelUsername">
                    </div>
                    <#if errors.username??>
                        <div class="form-text text-danger">${errors.username}</div>
                    </#if>
                </div>
            </div>
            <div class="row">
                <div class="col mb-3">
                    <label for="loginPanelPassword" class="form-label">Password</label>
                    <div class="input-group">
                        <input type="password" name="password" class="form-control" id="loginPanelPassword">
                    </div>
                    <#if errors.password??>
                        <div class="form-text text-danger">${errors.password}</div>
                    </#if>
                </div>
            </div>
            <#if enablePrivacyPolicyAgreementOnLogin>
                <div class="row">
                    <div class="col mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="acceptPrivacyPolicy"
                                    name="acceptPrivacyPolicy">
                            <label class="form-check-label" for="acceptPrivacyPolicy"> Accept Privacy Policy </label>
                            <a class="ml-3" href="/fixed/privacy"
                                    onclick="${testMode?string('alert(&quot;View privacy policy clicked&quot;); event.preventDefault();','')}">View</a>
                        </div>
                        <#if errors.acceptPrivacyPolicy??>
                            <div class="form-text text-danger">${errors.acceptPrivacyPolicy}</div>
                        </#if>
                    </div>
                </div>
            </#if>
            <div class="row">
                <div class="col s12">
                    <#if errors.global??>
                        <span class="login-error form-text text-danger">${errors.global}</span>
                    </#if>
                </div>
            </div>
        </div>
        <div class="card-footer text-muted">
            <div class="button-panel">
                <button id="login-button" class="btn btn-primary" type="submit" name="login"
                        onclick="${testMode?string('alert(&quot;Login button clicked&quot;); event.preventDefault();','')}">
                    Login
                </button>
                <#if enableRegistration>
                    <button id="register-button" class="btn btn-success" type="submit"
                            name="register"
                            onclick="${testMode?string('alert(&quot;Register button clicked&quot;); event.preventDefault();','')}">
                        Register
                    </button>
                </#if>
            </div>
            <div class="button-panel">
                <button id="forgot-password-button" class="btn btn-link" type="submit" name="forgotPassword"
                        onclick="${testMode?string('alert(&quot;Forgot Password link clicked&quot;); event.preventDefault();','')}">
                    Forgot Password
                </button>
            </div>
        </div>
    </div>
</form>