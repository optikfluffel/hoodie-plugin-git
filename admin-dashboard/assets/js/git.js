$(function () {
    /*
    *   This is an attempt to provide an app valid git url
    *   Mileage will vary so adpat accordingly
    */
  
    if (window.location.host.indexOf('admin') > -1 && !window.location.port) { /* probably hosted on Appback */
        var gitHost = window.location.protocol+'//'+window.location.host.replace('admin','git');
        $('.gitHost').text(gitHost);
    } else if (window.location.port) { /* probably also accessing git via port */
        couchr.get('/_api/plugins/'+encodeURIComponent('plugin/hoodie-plugin-git'), function(err, doc){
            var port = doc.config.port;
            var gitHost = window.location.protocol+'//'+'YOUR-DOMAIN-OR-IP:'+port;
            $('.gitHost').text(gitHost);
        });
    } else { /* catch all */
        var gitHost = window.location.protocol+'//'+'YOUR-DOMAIN-OR-IP:PORT';
        $('.gitHost').text(gitHost);
    }
});
