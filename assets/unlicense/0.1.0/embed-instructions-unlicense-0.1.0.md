=== ":material-language-html5: html" 

    # Embedding Your License

    ```html title="add this to your site's html"

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

