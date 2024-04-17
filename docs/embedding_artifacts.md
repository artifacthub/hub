# Embedding artifacts

Artifact Hub allows embedding a single artifact or a group of them in other websites.

## Embedding a single artifact

You can embed an Artifact Hub package on other websites by adding the corresponding embed code. The embed code is a piece of HTML that can be generated from the Artifact Hub UI.

Let's go through an example to see how this works.

The first step is to find the package you'd like to embed on <https://artifacthub.io>. For this example, we'll use the [Artifact Hub Helm chart](https://artifacthub.io/packages/helm/artifact-hub/artifact-hub). On the top right corner of the package view you'll see a button with three dots.

![Embed screenshot](https://artifacthub.github.io/hub/screenshots/embed-screenshot-1.jpg)

If you click on it, you'll see an entry named `Embed widget`, which opens the widget configurator. From it you can customize the widget's appearance to suit your needs. Once you are done, you can copy the resulting embed code by clicking on `copy code to clipboard` at the bottom.

![Embed screenshot](https://artifacthub.github.io/hub/screenshots/embed-screenshot-2.jpg)

The generated code would be something like this:

```html
<div
  class="artifacthub-widget"
  data-url="https://artifacthub.io/packages/helm/artifact-hub/artifact-hub"
  data-theme="light"
  data-header="true"
  data-stars="true"
  data-responsive="false"
>
  <blockquote>
     <p lang="en" dir="ltr"><b>artifact-hub</b>: Artifact Hub is a web-based application that enables finding, installing, and publishing Cloud Native packages.</p>
     &mdash; Open in <a href="https://artifacthub.io/packages/helm/artifact-hub/artifact-hub">Artifact Hub</a>
  </blockquote>
</div>
<script async src="https://artifacthub.io/artifacthub-widget.js"></script>
```

To verify it works as expected, you can give it a quick try on JSFiddle if you'd like: <https://jsfiddle.net/r0ox4c9a/>.

## Embedding a group of artifacts

Embedding a group of artifacts is very similar to embedding a single one. The main difference is that, instead of opening the widget configurator from the package view, it is opened from the search results view.

![Embed screenshot](https://artifacthub.github.io/hub/screenshots/embed-screenshot-3.jpg)

This allows you to use all the search filters available to select what packages you'd like to embed on the other website. You could choose all packages of a given kind, those published by a given organization or all packages provided by CNCF projects, for example. Then, from the configurator, you can customize the appearance of the widgets like we did on the previous case with a single artifact.

![Embed screenshot](https://artifacthub.github.io/hub/screenshots/embed-screenshot-4.jpg)

Once you are ready to go, you can copy the embed code and add it to the website you'd like to embed the artifacts on.

You can see a widgets group in action in [this JSFiddle](https://jsfiddle.net/7nvkcfqb/).
