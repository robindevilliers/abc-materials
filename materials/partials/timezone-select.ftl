<#if size == 'SMALL'>
    <#assign sizeCls = 'form-control-sm'>
<#elseif size == 'MEDIUM'>
    <#assign sizeCls = 'form-control-md'>
<#elseif size == 'LARGE'>
    <#assign sizeCls = 'form-control-lg'>
</#if>

<label class="form-label ${textualClasses}" style="${textualStyles}" for="${id}">${content}</label>
<select id="${id}" class="input-group ${sizeCls} form-control" name="${name}"
        <#if disabled??>disabled</#if>>
    <option value="" disabled selected>Choose timezone</option>
    <#list values as val>
        <option <#if value?? && value == val.id>selected</#if> value="${val.id}">${val.offset} (${val.displayName}) ${val.id}</option>
    </#list>
</select>
<#if (error)??>
    <span id="error-message-${name}" class="form-text text-danger">${error}</span>
</#if>