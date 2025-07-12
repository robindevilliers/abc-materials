<#if size == 'SMALL'>
    <#assign sizeCls = 'form-control-sm'>
<#elseif size == 'MEDIUM'>
    <#assign sizeCls = 'form-control-md'>
<#elseif size == 'LARGE'>
    <#assign sizeCls = 'form-control-lg'>
</#if>

<div class="input-widget ${classes}" style="${itemStyles}">
    <div class="form-group">

        <#if type == "NUMBER">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <input id="${id}" class="form-control ${sizeCls} validate" type="number" name="${name}"
                    value="${value!}" <#if disabled??>disabled</#if>
                    <#if min??>min="${min}"</#if>
                    <#if max??>max="${max}"</#if>
            />
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "INPUT" || type == "PASSWORD">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <input id="${id}" class="form-control ${sizeCls} validate"
                    type="<#if type == "PASSWORD">password<#else>text</#if>"
                    <#if maxlength??>maxlength="${maxlength}"</#if> <#if disabled??>disabled</#if> name="${name}"
                    value="${value!}"
            />
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "TEXTAREA">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <textarea id="${id}" class="form-control ${sizeCls} validate" name="${name}"
                    <#if maxLength??>maxLength="${maxLength}"</#if>
                    <#if cols??>cols="${cols}"</#if>
                    <#if rows??>rows="${rows}"</#if>
                    <#if disabled??>disabled</#if>
                    >${value!}</textarea>
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "DATE">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <input id="${id}" class="form-control ${sizeCls} validate" type="date" maxlength="10"
                    name="${name}" value="${value!}" <#if disabled??>disabled</#if>
                    placeholder="yyyy-MM-dd"/>
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "DATETIME">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <input id="${id}" class="form-control ${sizeCls} validate" type="datetime-local" maxlength="16"
                    name="${name}" value="${value!}" <#if disabled??>disabled</#if>
                    placeholder="yyyy-MM-dd HH:mm"/>
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "CURRENCY">
            <label class="form-label label ${textualClasses} <#if hideLabel>sr-only</#if>" style="${textualStyles}"
                    for="${id}">${content}</label>
            <div class="input-group">
                <div class="input-group-prepend">
                    <span class="input-group-text">${currencySymbol}</span>
                </div>
                <input id="${id}" class="form-control ${sizeCls} validate" type="number" step="0.01"
                        name="${name}" value="${value!}" <#if disabled??>disabled</#if>
                />
            </div>
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
        <#if type == "CHECKBOX">
            <div class="form-check">
                <input class="form-check-input ${sizeCls}" type="checkbox" name="${name}" value="selected" id="${id}"
                        <#if value == 'selected'>checked</#if> <#if disabled??>disabled</#if> >
                <label class="form-check-label label ${sizeCls} ${textualClasses}" style="${textualStyles}"
                        for="${id}">${content}</label>
            </div>
            <#if (error)??>
                <span id="error-message-${name}" class="error-message">${error}</span>
            </#if>
        </#if>
    </div>
</div>
