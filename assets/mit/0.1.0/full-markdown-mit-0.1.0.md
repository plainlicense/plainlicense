
////// admonition | <span class='detail-title-highlight'>The Plain MIT License</span>
       type: license

=== ":material-book-open-variant: reader" 


                    <div class="license-header">
    <h1 class='license-title'>Plain MIT License</h1><div class='version-info'><span class='plain_version'>plain version: 0.1.0</span></div></div>
                    Copyright (c) 2025 `[copyright holders]`

    <h2 class="license-first-header">You are Free to Use, Change, and Share This Work</h2>

    We, the authors, give you a license to **use, copy, change, distribute, and sell the work and all related materials for free.** You can also license the work under different terms. You agree to these terms by using, copying, or sharing the work. Everyone who gets a copy of the work may use the work under these terms.

    ### You Must Give Us Credit

    You **must include our original copyright notice and this license in all copies or substantial portions of the work.**

    ## If You Use the Work, You Accept It "As Is"

    We offer the work as-is with **no warranties. We are not responsible for any damages or issues** from your use of the work.

    //// note | Legally Interpreting the Plain MIT License

    The Plain MIT License is a plain language version of the MIT License. We wrote it to make the MIT License more accessible and understandable. We tried to match the MIT License's legal intent. We didn't intend any differences in meaning. **If you are using the Plain MIT License in a legal context, you should refer to the official MIT License for clarification.**

    If a court finds that any part of this license can't be enforced, the rest of the license terms still apply.
    ////

                    <div class='admonition warning'><p class='admonition-title'>The Plain MIT License isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/permissive/mit/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official MIT License" 

        Plain License is not affiliated with the original MIT License authors or Massachusetts Institute of Technology. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain MIT License, start by reading the official MIT License license text. You can find the official MIT License [here](https://opensource.org/licenses/MIT "check out the official MIT License"). If you have questions about the MIT License, you should talk to a lawyer.

    </div>


=== ":material-language-html5: html" 

    # Embedding Your License

    ```html title="add this to your site's html"

    <iframe src="https://plainlicense.org/embed/mit.html"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    border: 1px solid #E4C580; border-radius: 8px; overflow: hidden auto;"
    title="The Plain MIT License" loading="lazy" sandbox="allow-scripts"
    onload="if(this.contentDocument.body.scrollHeight > 400)
    this.style.height = this.contentDocument.body.scrollHeight + 'px';"
    referrerpolicy="no-referrer-when-downgrade">
        <p>Your browser does not support iframes. View The Plain MIT License at:
            <a href="licenses/permissive/mit/index.html">
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

    - For light theme: `src="https://plainlicense.org/embed/mit.html?theme=light"`
    - For dark theme: `src="https://plainlicense.org/embed/mit.html?theme=dark"`

    ### Syncing the License Theme with Your Site (more advanced)

    You can optionally sync the license's light/dark theme to your site's theme. You will need to send the embedded license page a message to tell it what theme your site is currently using. You can include this code in your script bundle or HTML:

    ```javascript title="sync the light/dark theme with your site"

    const syncTheme = () => {
    const iframe = document.getElementById("license-embed");
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    iframe.contentWindow.postMessage({ theme }, "https://plainlicense.org");
    };

    ```

    If your site has a toggle switch for changing themes, you can link it to the embedded license. Set up the toggle to send a `themeChange` event and add a listener to dispatch the same message. We can't provide specific code for that because it depends on your setup.

    Once your toggle switch is set up to send a `themeChange` event, you need to add a listener to dispatch the same message as before:

    ```javascript title="toggle license theme with site theme"

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



    ```markdown title="The Plain MIT License in Github-style markdown"

    > plain version: 0.1.0

    # Plain MIT License

    Copyright (c) 2025 `[copyright holders]`

    ## You are Free to Use, Change, and Share This Work

    We, the authors, give you a license to **use, copy, change,
    distribute, and sell the work and all related materials for free.**
    You can also license the work under different terms. You agree to
    these terms by using, copying, or sharing the work. Everyone who gets
    a copy of the work may use the work under these terms.

    ### You Must Give Us Credit

    You **must include our original copyright notice and this license in
    all copies or substantial portions of the work.**

    ## If You Use the Work, You Accept It "As Is"

    We offer the work as-is with **no warranties. We are not responsible
    for any damages or issues** from your use of the work.

    ### Legally Interpreting the Plain MIT License

    The Plain MIT License is a plain language version of the MIT License.
    We wrote it to make the MIT License more accessible and
    understandable. We tried to match the MIT License's legal intent. We
    didn't intend any differences in meaning. **If you are using the Plain
    MIT License in a legal context, you should refer to the official MIT
    License for clarification.**

    If a court finds that any part of this license can't be enforced, the
    rest of the license terms still apply.
    ```

    <div class='admonition warning'><p class='admonition-title'>The Plain MIT License isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/permissive/mit/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official MIT License" 

        Plain License is not affiliated with the original MIT License authors or Massachusetts Institute of Technology. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain MIT License, start by reading the official MIT License license text. You can find the official MIT License [here](https://opensource.org/licenses/MIT "check out the official MIT License"). If you have questions about the MIT License, you should talk to a lawyer.

    </div>


=== ":nounproject-txt: plaintext" 



    ```plaintext title="The Plain MIT License in plain text"

    plain version: 0.1.0

    PLAIN MIT LICENSE

    Copyright (c) 2025 [copyright holders]

    You are Free to Use, Change, and Share This Work

    We, the authors, give you a license to use, copy, change, distribute,
    and sell the work and all related materials for free. You can also
    license the work under different terms. You agree to these terms by
    using, copying, or sharing the work. Everyone who gets a copy of the
    work may use the work under these terms.

    You Must Give Us Credit

    You must include our original copyright notice and this license in all
    copies or substantial portions of the work.

    If You Use the Work, You Accept It "As Is"

    We offer the work as-is with no warranties. We are not responsible for
    any damages or issues from your use of the work.

    LEGALLY INTERPRETING THE PLAIN MIT LICENSE

    The Plain MIT License is a plain language version of the MIT License.
    We wrote it to make the MIT License more accessible and
    understandable. We tried to match the MIT License's legal intent. We
    didn't intend any differences in meaning. If you are using the Plain
    MIT License in a legal context, you should refer to the official MIT
    License for clarification.

    If a court finds that any part of this license can't be enforced, the
    rest of the license terms still apply.
    ```

    <div class='admonition warning'><p class='admonition-title'>The Plain MIT License isn't...</p>

    === "legal advice" 

        We are not lawyers. This is not legal advice. If you need legal advice, talk to a lawyer. You use this license at your own risk.

        We are normal people who want to make licenses accessible for everyone. We hope that our plain language helps you and anyone else understand this license  (including lawyers). If you see a mistake or want to suggest a change, please [submit an issue on GitHub]([submit an issue](https://github.com/plainlicense/plainlicense/issues/new/choose "Submit an issue on GitHub") "Submit an issue on GitHub") or [edit this page]([edit this page](https://github.com/plainlicense/plainlicense/edit/main/docs/licenses/permissive/mit/index.md "Edit this license on GitHub") "edit on GitHub").

    === "the official MIT License" 

        Plain License is not affiliated with the original MIT License authors or Massachusetts Institute of Technology. **Our plain language versions are not official** and are not endorsed by the original authors. Our licenses may also include different terms or additional information. We try to capture the *legal meaning* of the original license, but we can't guarantee our license provides the same legal protections.

        If you want to use the Plain MIT License, start by reading the official MIT License license text. You can find the official MIT License [here](https://opensource.org/licenses/MIT "check out the official MIT License"). If you have questions about the MIT License, you should talk to a lawyer.

    </div>


=== ":material-history: changelog" 

    === ":material-history: changelog" 


        ## such empty, much void :nounproject-doge:


=== ":material-license: official" 

    # The MIT License (MIT)

    Copyright (c) {{ year }} `<copyright holders>`

    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the “Software”), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    [MIT License](https://opensource.org/licenses/MIT "Official MIT License")

//////

