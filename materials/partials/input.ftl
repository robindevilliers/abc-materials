<#if size == 'SMALL'>
    <#assign sizeCls = 'form-control-sm'>
<#elseif size == 'MEDIUM'>
    <#assign sizeCls = 'form-control-md'>
<#elseif size == 'LARGE'>
    <#assign sizeCls = 'form-control-lg'>
</#if>

<div class="input-widget form-group ${classes}" style="${itemStyles}">

    <#if type == "NUMBER">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <input id="${id}" class="form-control ${sizeCls} validate" type="number" name="${name}"
                    value="${value!}" <#if disabled??>disabled</#if>
                    <#if min??>min="${min}"</#if>
                    <#if max??>max="${max}"</#if>
            />
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "INPUT">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <input id="${id}" class="form-control ${sizeCls} validate" type="text"
                    <#if maxlength??>maxlength="${maxlength}"</#if> <#if disabled??>disabled</#if> name="${name}"
                    value="${value!}"
            />
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "TEXTAREA">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <textarea id="${id}" class="form-control ${sizeCls} validate" name="${name}"
                    <#if maxLength??>maxLength="${maxLength}"</#if>
                    <#if cols??>cols="${cols}"</#if>
                    <#if rows??>rows="${rows}"</#if>
                    <#if disabled??>disabled</#if>
                    >${value!}</textarea>
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "DATE">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <input id="${id}" class="form-control ${sizeCls} validate" type="date" maxlength="10"
                    name="${name}" value="${value!}" <#if disabled??>disabled</#if>
                    placeholder="yyyy-MM-dd"/>
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "DATETIME">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <input id="${id}" class="form-control ${sizeCls} validate" type="datetime-local" maxlength="16"
                    name="${name}" value="${value!}" <#if disabled??>disabled</#if>
                    placeholder="yyyy-MM-dd HH:mm"/>
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "CURRENCY">
        <label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        <div class="input-group">
            <span class="input-group-text">${currencySymbol}</span>
            <input id="${id}" class="form-control ${sizeCls} validate" type="number" step="0.01"
                    name="${name}" value="${value!}" <#if disabled??>disabled</#if>
            />
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
    <#if type == "CHECKBOX">
        <div class="form-check">
            <input class="form-check-input ${sizeCls}" type="checkbox" name="${name}" value="selected" id="${id}"
                    <#if value == 'selected'>checked</#if> <#if disabled??>disabled</#if> >
            <label class="form-check-label ${sizeCls} ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
        </div>
        <#if (error)??>
            <span id="error-message-${name}" class="form-text text-danger">${error}</span>
        </#if>
    </#if>
</div>
