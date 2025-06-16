
////// admonition | The Plain Unlicense
       type: license

=== ":material-book-open-variant: reader" 


                    <div class='license license-header'>
    # Plain Unlicense

    <div class='version-info'><span class='license plain_version'>plain version: 0.1.0</span></div></div>
                    ## You are Free to Use The Work - We Dedicate It to the Public Domain

    **We, the authors, dedicate the work to the public domain.**
    You can use it freely for any purpose and in any way you want. We give away all rights and interest in the work to the public domain forever.

    ## You Can Do Anything with the Work

    - **Use the work for anything** you want, in whole or in part.
    - **Copy, change, distribute, or sell** the work.
    - Use the work for any purpose without restrictions.
    - **License anything you create with the work however you want.**

    **You do not need to do anything to use the work.** You do not need to ask for permission, give credit, or pay us. You can use the work without any restrictions.

    ## We Give You a License with No Restrictions

    Some courts do not recognize public domain dedications. For such cases, we give you a license to use and change the work worldwide. You and everyone else can use the work forever and never need to pay to use it. No one can take this license from you.

    ## We Provide No Warranty and Accept No Liability

    **We offer the work "as is" with no warranties.** We are not responsible for any damages or issues from your use of the work.

    //// note | Legally Interpreting the Plain Unlicense

    The Plain Unlicense is a plain language version of the Unlicense. We wrote it to make the Unlicense more accessible and understandable. We tried to match the Unlicense's legal intent. We didn't intend any differences in meaning. **If you are using the Plain Unlicense in a legal context, you should refer to the official Unlicense for clarification.**

    If a court finds that any part of this dedication can't be enforced, the rest of the dedication terms still apply.
    ////

                    <div class='admonition warning'><p class='admonition-title'>The Plain Unlicense isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people making licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/public-domain/unlicense/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official Unlicense" 

        Plain License is not affiliated with the original Unlicense authors or unlicense.org. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain Unlicense, start by reading the official Unlicense license text. You can find the official Unlicense [here](https://unlicense.org/ "check out the official Unlicense"). If you have questions about the Unlicense, you should talk to a lawyer.

    </div>


=== ":material-language-html5: html" 

    # Embedding Your License

    ```html

    <iframe src="https://plainlicense.org/embed/unlicense.html"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;"
    title="The Plain Unlicense" loading="lazy" sandbox="allow-scripts"
    onload="if(this.contentDocument.body.scrollHeight > 400)
    this.style.height = this.contentDocument.body.scrollHeight + 'px';"
    referrerpolicy="no-referrer-when-downgrade">
        <p>Your browser does not support iframes. View The Plain Unlicense at:
            <a href="licenses/public-domain/unlicense/index.html">
                plainlicense.org
            </a>
        </p>
    </iframe>

    ```

    The above code will embed the license in your site. It uses an iframe to display the license as it appears on Plain License. This also sandboxes the license to prevent it from affecting your site.

    1. **Copy the code above** using the copy button
    2. **Paste it** into your HTML where you want the license to appear
    3. **Adjust the size** (optional):

       - The default width is 100% (fills the container)
       - The default height is either the content height or 1024px, whichever is smaller.
       - The next section provides more details on customizing the size.

    ## Customizing Your Embedded License

    ### Changing the Size

    Common size adjustments in the `style` attribute:

    ```html

    <!-- Full width, taller -->
    style="width: 100%; height: 800px;"

    <!-- Fixed width, default height -->
    style="width: 800px; height: 500px;"

    <!-- Full width, minimum height -->
    style="width: 100%; min-height: 500px;"

    ```

    ## Color Scheme Preference

    The embedded license will match your visitors' system preferences for light or dark mode by default.

    ### Forcing a Specific Theme

    To force a specific theme, add `?theme=` to the URL, along with `light` or `dark`:

    - For light theme: `src="https://plainlicense.org/embed/unlicense.html?theme=light"`
    - For dark theme: `src="https://plainlicense.org/embed/unlicense.html?theme=dark"`

    ### Syncing the License Theme with Your Site (more advanced)

    You can optionally sync the license's light/dark theme to your site's theme. You will need to send the embedded license page a message to tell it what theme your site is currently using. You can include this code in your script bundle or HTML:

    ```javascript

    const syncTheme = () => {
    const iframe = document.getElementById("license-embed");
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    iframe.contentWindow.postMessage({ theme }, "https://plainlicense.org");
    };

    ```

    If your site has a toggle switch for changing themes, you can link it to the embedded license. Set up the toggle to send a `themeChange` event and add a listener to dispatch the same message. We can't provide specific code for that because it depends on your setup.

    Once your toggle switch is set up to send a `themeChange` event, you need to add a listener to dispatch the same message as before:

    ```javascript

    const syncTheme = () => {
    const iframe = document.getElementById("license-embed");
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    iframe.contentWindow.postMessage({ theme }, "https://plainlicense.org");
    };
    document.addEventListener('themeChange', syncTheme);

    ```

    ## Need Help?

    Bring your questions to our [GitHub Discussions](https://github.com/plainlicense/plainlicense/discussions "visit Plain License's discussions page") for help and support.


=== ":octicons-markdown-24: markdown" 



    ```markdown 

    > plain version: 0.1.0

    # Plain Unlicense



    ## You are Free to Use The Work - We Dedicate It to the Public Domain

    **We, the authors, dedicate the work to the public domain.**
    You can use it freely for any purpose and in any way you want. We give
    away all rights and interest in the work to the public domain forever.

    ## You Can Do Anything with the Work

    - **Use the work for anything** you want, in whole or in part.
    - **Copy, change, distribute, or sell** the work.
    - Use the work for any purpose without restrictions.
    - **License anything you create with the work however you want.**

    **You do not need to do anything to use the work.** You do not need to
    ask for permission, give credit, or pay us. You can use the work
    without any restrictions.

    ## We Give You a License with No Restrictions

    Some courts do not recognize public domain dedications. For such
    cases, we give you a license to use and change the work worldwide. You
    and everyone else can use the work forever and never need to pay to
    use it. No one can take this license from you.

    ## We Provide No Warranty and Accept No Liability

    **We offer the work "as is" with no warranties.** We are not
    responsible for any damages or issues from your use of the work.


    ### Legally Interpreting the Plain Unlicense

    The Plain Unlicense is a plain language version of the Unlicense. We
    wrote it to make the Unlicense more accessible and understandable. We
    tried to match the Unlicense's legal intent. We didn't intend any
    differences in meaning. **If you are using the Plain Unlicense in a
    legal context, you should refer to the official Unlicense for
    clarification.**

    If a court finds that any part of this dedication can't be enforced,
    the rest of the dedication terms still apply.
    ```

    <div class='admonition warning'><p class='admonition-title'>The Plain Unlicense isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people making licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/public-domain/unlicense/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official Unlicense" 

        Plain License is not affiliated with the original Unlicense authors or unlicense.org. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain Unlicense, start by reading the official Unlicense license text. You can find the official Unlicense [here](https://unlicense.org/ "check out the official Unlicense"). If you have questions about the Unlicense, you should talk to a lawyer.

    </div>


=== ":nounproject-txt: plaintext" 



    ```plaintext

    plain version: 0.1.0

    PLAIN UNLICENSE



    You are Free to Use The Work - We Dedicate It to the Public Domain

    We, the authors, dedicate the work to the public domain.
    You can use it freely for any purpose and in any way you want. We give
    away all rights and interest in the work to the public domain forever.

    You Can Do Anything with the Work

    - Use the work for anything you want, in whole or in part.
    - Copy, change, distribute, or sell the work.
    - Use the work for any purpose without restrictions.
    - License anything you create with the work however you want.

    You do not need to do anything to use the work. You do not need to ask
    for permission, give credit, or pay us. You can use the work without
    any restrictions.

    We Give You a License with No Restrictions

    Some courts do not recognize public domain dedications. For such
    cases, we give you a license to use and change the work worldwide. You
    and everyone else can use the work forever and never need to pay to
    use it. No one can take this license from you.

    We Provide No Warranty and Accept No Liability

    We offer the work "as is" with no warranties. We are not responsible
    for any damages or issues from your use of the work.

    LEGALLY INTERPRETING THE PLAIN UNLICENSE

    The Plain Unlicense is a plain language version of the Unlicense. We
    wrote it to make the Unlicense more accessible and understandable. We
    tried to match the Unlicense's legal intent. We didn't intend any
    differences in meaning. If you are using the Plain Unlicense in a
    legal context, you should refer to the official Unlicense for
    clarification.

    If a court finds that any part of this dedication can't be enforced,
    the rest of the dedication terms still apply.
    ```

    <div class='admonition warning'><p class='admonition-title'>The Plain Unlicense isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people making licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/public-domain/unlicense/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official Unlicense" 

        Plain License is not affiliated with the original Unlicense authors or unlicense.org. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain Unlicense, start by reading the official Unlicense license text. You can find the official Unlicense [here](https://unlicense.org/ "check out the official Unlicense"). If you have questions about the Unlicense, you should talk to a lawyer.

    </div>


=== ":material-history: changelog" 

    === ":material-history: changelog" 


        ## such empty, much void :nounproject-doge:


=== ":material-license: official" 

    # Unlicense (Public Domain)

    This is free and unencumbered software released into the public domain.

    Anyone is free to copy, modify, publish, use, compile, sell, or
    distribute this software, either in source code form or as a compiled
    binary, for any purpose, commercial or non-commercial, and by any
    means.

    In jurisdictions that recognize copyright laws, the author or authors
    of this software dedicate any and all copyright interest in the
    software to the public domain. We make this dedication for the benefit
    of the public at large and to the detriment of our heirs and
    successors. We intend this dedication to be an overt act of
    relinquishment in perpetuity of all present and future rights to this
    software under copyright law.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
    OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    For more information, please refer to <https://unlicense.org>.

//////

